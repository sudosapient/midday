import { describe, expect, it } from "bun:test";
import { isBlockedNewUser, NEW_USER_CUTOFF } from "./new-user-gate";

const hostedProduction = {
  deploymentMode: "hosted",
  nodeEnv: "production",
};

describe("isBlockedNewUser", () => {
  it("blocks post-cutoff users in hosted production", () => {
    expect(isBlockedNewUser(NEW_USER_CUTOFF, hostedProduction)).toBe(true);
    expect(isBlockedNewUser("2026-04-21T00:00:00.000Z", hostedProduction)).toBe(
      true,
    );
  });

  it("allows pre-cutoff users in hosted production", () => {
    expect(isBlockedNewUser("2026-04-19T23:59:59.999Z", hostedProduction)).toBe(
      false,
    );
  });

  it("allows post-cutoff users in company mode", () => {
    expect(
      isBlockedNewUser(NEW_USER_CUTOFF, {
        deploymentMode: "company",
        nodeEnv: "production",
      }),
    ).toBe(false);
  });

  it("allows post-cutoff users in local development", () => {
    expect(
      isBlockedNewUser(NEW_USER_CUTOFF, {
        deploymentMode: "hosted",
        nodeEnv: "development",
      }),
    ).toBe(false);
  });

  it("allows users without a creation timestamp", () => {
    expect(isBlockedNewUser(undefined, hostedProduction)).toBe(false);
  });
});
