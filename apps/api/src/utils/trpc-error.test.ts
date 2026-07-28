import { describe, expect, test } from "bun:test";
import { getTRPCErrorMetadata } from "./trpc-error";

describe("getTRPCErrorMetadata", () => {
  test("returns correlation metadata without request input", () => {
    const metadata = getTRPCErrorMetadata({
      path: "team.create",
      code: "INTERNAL_SERVER_ERROR",
      requestId: "request-123",
      cfRay: "ray-123",
    });

    expect(metadata).toEqual({
      path: "team.create",
      code: "INTERNAL_SERVER_ERROR",
      requestId: "request-123",
      cfRay: "ray-123",
    });
    expect(metadata).not.toHaveProperty("input");
  });
});
