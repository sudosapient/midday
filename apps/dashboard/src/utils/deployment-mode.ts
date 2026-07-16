export type DeploymentEnvironment = {
  deploymentMode?: string;
  nodeEnv?: string;
};

export function isCompanyDeployment(
  deploymentMode = process.env.DEPLOYMENT_MODE,
) {
  return deploymentMode === "company";
}

export function hasHostedWindDownBehavior({
  deploymentMode = process.env.DEPLOYMENT_MODE,
  nodeEnv = process.env.NODE_ENV,
}: DeploymentEnvironment = {}) {
  return nodeEnv === "production" && !isCompanyDeployment(deploymentMode);
}
