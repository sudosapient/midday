import { describe, expect, it } from "bun:test";
import {
  hasHostedWindDownBehavior,
  isCompanyDeployment,
} from "./deployment-mode";

describe("isCompanyDeployment", () => {
  it("recognizes company deployment mode", () => {
    expect(isCompanyDeployment("company")).toBe(true);
  });

  it("treats other explicit modes as hosted", () => {
    expect(isCompanyDeployment("hosted")).toBe(false);
  });
});

describe("hasHostedWindDownBehavior", () => {
  it("enables hosted wind-down behavior in production", () => {
    expect(
      hasHostedWindDownBehavior({
        deploymentMode: "hosted",
        nodeEnv: "production",
      }),
    ).toBe(true);
  });

  it("disables hosted wind-down behavior for company deployments", () => {
    expect(
      hasHostedWindDownBehavior({
        deploymentMode: "company",
        nodeEnv: "production",
      }),
    ).toBe(false);
  });

  it("disables hosted wind-down behavior in local development", () => {
    expect(
      hasHostedWindDownBehavior({
        deploymentMode: "hosted",
        nodeEnv: "development",
      }),
    ).toBe(false);
  });
});
