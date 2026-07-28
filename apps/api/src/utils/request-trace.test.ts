import { describe, expect, test } from "bun:test";
import { getRequestTrace } from "./request-trace";

describe("getRequestTrace", () => {
  test("reuses a generated trace for the same request", () => {
    const request = { header: () => undefined };

    expect(getRequestTrace(request)).toEqual(getRequestTrace(request));
  });
});
