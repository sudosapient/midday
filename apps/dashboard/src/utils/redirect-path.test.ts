import { describe, expect, it } from "bun:test";
import { sanitizeRedirectPath } from "@midday/utils/sanitize-redirect";
import { normalizeRedirectPath } from "./redirect-path";

describe("normalizeRedirectPath", () => {
  it("defaults missing paths to the dashboard root", () => {
    expect(normalizeRedirectPath(undefined)).toBe("/");
    expect(normalizeRedirectPath("")).toBe("/");
  });

  it("adds the leading slash stripped by auth middleware", () => {
    expect(normalizeRedirectPath("settings/accounts?tab=bank")).toBe(
      "/settings/accounts?tab=bank",
    );
  });

  it("preserves root-relative paths", () => {
    expect(normalizeRedirectPath("/transactions")).toBe("/transactions");
  });

  it("leaves unsafe URL forms for the sanitizer to reject", () => {
    expect(sanitizeRedirectPath(normalizeRedirectPath("//evil.example"))).toBe(
      "/",
    );
    expect(
      sanitizeRedirectPath(normalizeRedirectPath("https://evil.example")),
    ).toBe("/");
  });
});
