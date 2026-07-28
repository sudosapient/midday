import { describe, expect, test } from "bun:test";
import { getAuthCookieOptions } from "./cookie-options";

describe("getAuthCookieOptions", () => {
  test("uses the public Supabase host when the server connects internally", () => {
    expect(
      getAuthCookieOptions("http://kong:8000", "http://127.0.0.1:54321"),
    ).toEqual({ name: "sb-127-auth-token" });
  });
});
