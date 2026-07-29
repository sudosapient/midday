import { createHash } from "node:crypto";
import type { MCPClient } from "@ai-sdk/mcp";
import { createMCPClient } from "@ai-sdk/mcp";
import { createOpenAI } from "@ai-sdk/openai";
import { createMcpServer } from "@api/mcp/server";
import type { McpContext } from "@api/mcp/types";
import { expandScopes } from "@api/utils/scopes";
import { logger } from "@midday/logger";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { PrepareStepFunction, Tool } from "ai";
import type { ToolIndex } from "toolpick";
import { createToolIndex, fileCache } from "toolpick";

export type ChatMCPClient = Awaited<ReturnType<typeof createMCPClient>>;
type ToolDefinitions = Awaited<ReturnType<MCPClient["listTools"]>>;

let cachedDefinitions: ToolDefinitions | null = null;
let cachedIndex: ToolIndex<any> | null = null;
let inflightIndexPromise: Promise<ToolIndex<any>> | null = null;
let inflightDefinitionsPromise: Promise<ToolDefinitions> | null = null;

const embeddingModelName =
  process.env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small";
const separateEmbeddingBaseUrl =
  process.env.OPENAI_EMBEDDING_BASE_URL?.trim() || undefined;
const embeddingBaseUrl =
  separateEmbeddingBaseUrl || process.env.OPENAI_BASE_URL?.trim() || undefined;
const embeddingProvider = createOpenAI({
  apiKey:
    process.env.OPENAI_EMBEDDING_API_KEY?.trim() ||
    (separateEmbeddingBaseUrl ? "ollama" : process.env.OPENAI_API_KEY),
  baseURL: embeddingBaseUrl,
});
const embeddingCacheKey =
  `${embeddingBaseUrl ?? "openai"}-${embeddingModelName}`
    .replace(/^https?:\/\//, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_");

async function bootstrapTools(ctx: McpContext) {
  const mcpServer = createMcpServer(ctx);
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  await mcpServer.connect(serverTransport);

  const client = await createMCPClient({
    transport: clientTransport,
    name: "midday-bootstrap",
  });

  const definitions = await client.listTools();
  const tools = client.toolsFromDefinitions(definitions);
  await client.close();

  return { definitions, tools };
}

export function ensureToolDefinitions(
  ctx: McpContext,
): Promise<ToolDefinitions> {
  if (cachedDefinitions) return Promise.resolve(cachedDefinitions);
  if (inflightDefinitionsPromise) return inflightDefinitionsPromise;

  inflightDefinitionsPromise = bootstrapTools(ctx)
    .then(({ definitions }) => {
      cachedDefinitions = definitions;
      return definitions;
    })
    .finally(() => {
      inflightDefinitionsPromise = null;
    });

  return inflightDefinitionsPromise;
}

export function ensureToolIndex(ctx: McpContext): Promise<ToolIndex<any>> {
  if (cachedIndex) return Promise.resolve(cachedIndex);
  if (inflightIndexPromise) return inflightIndexPromise;

  inflightIndexPromise = (async () => {
    const { definitions, tools } = await bootstrapTools(ctx);
    cachedDefinitions = definitions;
    const toolCatalogHash = createHash("sha256")
      .update(
        JSON.stringify(
          [...definitions.tools].sort((a, b) => a.name.localeCompare(b.name)),
        ),
      )
      .digest("hex")
      .slice(0, 12);

    const index = await createToolIndex(tools, {
      embeddingModel: embeddingProvider.embeddingModel(embeddingModelName),
      embeddingCache: fileCache(
        `.toolpick-cache.${embeddingCacheKey}.${toolCatalogHash}.json`,
      ),
      relatedTools: {
        invoices_create: ["customers_list"],
        invoices_create_from_tracker: ["customers_list"],
        invoice_recurring_create: ["customers_list"],
        tracker_timer_start: ["tracker_projects_list"],
        tracker_entries_create: ["tracker_projects_list"],
        tracker_entries_list: ["tracker_projects_list"],
        tracker_projects_list: ["tracker_entries_list"],
        transactions_update: ["categories_list"],
      },
    });

    await index.warmUp();

    cachedIndex = index;
    return index;
  })().catch((err) => {
    inflightIndexPromise = null;
    throw err;
  });

  return inflightIndexPromise;
}

export function getToolDefinitions(): ToolDefinitions {
  if (!cachedDefinitions) {
    throw new Error(
      "Tool definitions not bootstrapped — call ensureToolIndex first",
    );
  }
  return cachedDefinitions;
}

/**
 * Build a prepareStep function that delegates to the cached tool index
 * but guarantees `alwaysActive` tool names are always exposed to the model.
 *
 * Toolpick's own `alwaysActive` option filters names against the index,
 * which excludes built-in provider tools like `web_search`. This wrapper
 * appends them after selection so they're never dropped.
 */
export function buildPrepareStep<T extends Record<string, Tool>>(options: {
  maxTools: number;
  alwaysActive?: string[];
}): PrepareStepFunction<T> {
  if (!cachedIndex) {
    throw new Error("Tool index not bootstrapped — call ensureToolIndex first");
  }

  const base = cachedIndex.prepareStep({ maxTools: options.maxTools });
  const always = options.alwaysActive ?? [];

  return (async (stepOptions: any) => {
    const step = await base(stepOptions);
    if (step?.activeTools && always.length > 0) {
      for (const name of always) {
        if (!step.activeTools.includes(name)) {
          step.activeTools.push(name);
        }
      }
    }
    return step;
  }) as PrepareStepFunction<T>;
}

export function getSearchTool() {
  if (!cachedIndex) {
    throw new Error("Tool index not bootstrapped — call ensureToolIndex first");
  }
  return cachedIndex.searchTool();
}

/**
 * Pre-warm the tool index at server startup so the first chat request
 * doesn't pay the MCP bootstrap + embedding cost. Safe to call multiple
 * times — subsequent calls are no-ops once the index is cached.
 */
export function warmToolIndex(): void {
  const stubCtx: McpContext = {
    db: {} as McpContext["db"],
    teamId: "warmup",
    userId: "warmup",
    userEmail: null,
    scopes: expandScopes(["apis.all"]) as McpContext["scopes"],
    apiUrl: process.env.MIDDAY_API_URL ?? "https://api.midday.ai",
    timezone: "UTC",
    locale: "en",
    countryCode: null,
    dateFormat: null,
    timeFormat: 24,
  };

  if (process.env.OPENAI_DISABLE_TOOL_INDEX === "true") {
    ensureToolDefinitions(stubCtx)
      .then(() => {
        logger.info(
          "[chat] Embedding tool index disabled; using direct tool exposure",
        );
      })
      .catch((err) => {
        logger.warn("[chat] Tool definition warm-up failed", {
          error: err instanceof Error ? err.message : String(err),
        });
      });
    return;
  }

  ensureToolIndex(stubCtx).catch((err) => {
    logger.warn(
      "[chat] Tool index warm-up failed (will retry on first request)",
      {
        error: err instanceof Error ? err.message : String(err),
      },
    );
  });
}

export async function createExecutionClient(ctx: McpContext) {
  const mcpServer = createMcpServer(ctx);
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await mcpServer.connect(serverTransport);
  return createMCPClient({
    transport: clientTransport,
    name: "midday-chat",
  });
}
