import { openai } from "@ai-sdk/openai";
import {
  buildPrepareStep,
  createExecutionClient,
  ensureToolDefinitions,
  ensureToolIndex,
  getSearchTool,
  getToolDefinitions,
} from "@api/chat/tools";
import { getComposioTools } from "@api/composio/client";
import type { McpContext } from "@api/mcp/types";
import { logger } from "@midday/logger";
import {
  type ModelMessage,
  smoothStream,
  stepCountIs,
  ToolLoopAgent,
  type ToolSet,
} from "ai";

export async function streamMiddayAssistant(params: {
  mcpCtx: McpContext;
  systemPrompt: string;
  modelMessages: Array<ModelMessage>;
}) {
  const { mcpCtx, systemPrompt, modelMessages } = params;

  const useToolIndex = process.env.OPENAI_DISABLE_TOOL_INDEX !== "true";
  if (useToolIndex) {
    await ensureToolIndex(mcpCtx);
  } else {
    await ensureToolDefinitions(mcpCtx);
  }

  const [resolvedClient, composioMetaTools] = await Promise.all([
    createExecutionClient(mcpCtx),
    getComposioTools(mcpCtx.userId),
  ]);

  let closed = false;
  const closeClient = async () => {
    if (closed) return;
    closed = true;
    await resolvedClient.close().catch(() => {});
  };

  try {
    const mcpTools = resolvedClient.toolsFromDefinitions(getToolDefinitions());
    const composioToolNames = Object.keys(composioMetaTools);
    const webSearchTools: ToolSet = {};
    if (process.env.OPENAI_ENABLE_WEB_SEARCH !== "false") {
      webSearchTools.web_search = openai.tools.webSearch({
        searchContextSize: "medium",
        userLocation: {
          type: "approximate",
          country: mcpCtx.countryCode ?? undefined,
          timezone: mcpCtx.timezone ?? undefined,
        },
      });
    }

    if (composioToolNames.length > 0) {
      logger.info("[chat] Composio tools available:", {
        tools: composioToolNames,
      });
    }

    const agent = new ToolLoopAgent({
      model: openai(process.env.OPENAI_MODEL || "gpt-4.1-mini"),
      instructions: systemPrompt,
      tools: {
        ...mcpTools,
        ...composioMetaTools,
        ...webSearchTools,
        ...(useToolIndex ? { search_tools: getSearchTool() } : {}),
      },
      prepareStep: useToolIndex
        ? buildPrepareStep({
            maxTools: 12,
            alwaysActive: [
              ...Object.keys(webSearchTools),
              "search_tools",
              ...composioToolNames,
            ],
          })
        : undefined,
      stopWhen: stepCountIs(10),
      onFinish: closeClient,
    });

    const result = await agent.stream({
      messages: modelMessages,
      experimental_transform: smoothStream(),
    });

    return Object.assign(result, { cleanup: closeClient });
  } catch (error) {
    await closeClient();
    throw error;
  }
}
