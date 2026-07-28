/**
 * Banking env vars are resolved lazily, on first access.
 *
 * This package is pulled into the API and worker boot path via
 * `@midday/health/probes` -> `./institutions`. Validating eagerly at import
 * time meant a deployment that does not use bank sync (no Plaid/GoCardless/
 * Teller/EnableBanking credentials) could not start at all: the process died
 * with "Invalid environment variables" before serving a single request.
 *
 * Each variable below is read by exactly one provider, so deferring the check
 * to the point of use means an unconfigured provider fails only when that
 * provider is actually invoked -- and fails with a message naming the missing
 * variable, rather than taking the whole service down at boot.
 */

type BankingEnvKey =
  | "PLAID_CLIENT_ID"
  | "PLAID_SECRET"
  | "PLAID_ENVIRONMENT"
  | "GOCARDLESS_SECRET_ID"
  | "GOCARDLESS_SECRET_KEY"
  | "ENABLEBANKING_APPLICATION_ID"
  | "ENABLE_BANKING_KEY_CONTENT"
  | "ENABLEBANKING_REDIRECT_URL"
  | "TELLER_CERT_BASE64"
  | "TELLER_KEY_BASE64"
  | "R2_ENDPOINT"
  | "R2_ACCESS_KEY_ID"
  | "R2_SECRET_ACCESS_KEY"
  | "R2_BUCKET_NAME"
  | "LOGO_DEV_TOKEN";

/** Which feature each var belongs to, for a useful error message. */
const FEATURE: Record<BankingEnvKey, string> = {
  PLAID_CLIENT_ID: "Plaid bank connections",
  PLAID_SECRET: "Plaid bank connections",
  PLAID_ENVIRONMENT: "Plaid bank connections",
  GOCARDLESS_SECRET_ID: "GoCardless bank connections",
  GOCARDLESS_SECRET_KEY: "GoCardless bank connections",
  ENABLEBANKING_APPLICATION_ID: "EnableBanking bank connections",
  ENABLE_BANKING_KEY_CONTENT: "EnableBanking bank connections",
  ENABLEBANKING_REDIRECT_URL: "EnableBanking bank connections",
  TELLER_CERT_BASE64: "Teller bank connections",
  TELLER_KEY_BASE64: "Teller bank connections",
  R2_ENDPOINT: "S3-compatible logo storage",
  R2_ACCESS_KEY_ID: "S3-compatible logo storage",
  R2_SECRET_ACCESS_KEY: "S3-compatible logo storage",
  R2_BUCKET_NAME: "S3-compatible logo storage",
  LOGO_DEV_TOKEN: "institution logo fallback (logo.dev)",
};

const DEFAULTS: Partial<Record<BankingEnvKey, string>> = {
  PLAID_ENVIRONMENT: "production",
};

function read(key: BankingEnvKey): string {
  const value = process.env[key] ?? DEFAULTS[key];

  if (value === undefined || value === "") {
    throw new Error(
      `Missing required environment variable ${key}, needed for ${FEATURE[key]}. ` +
        "Set it to enable this feature, or avoid using it.",
    );
  }

  if (key === "R2_ENDPOINT") {
    try {
      new URL(value);
    } catch {
      throw new Error(
        `Environment variable R2_ENDPOINT must be a valid URL, got "${value}".`,
      );
    }
  }

  return value;
}

/**
 * Reads like a plain object (`env.PLAID_SECRET`) but each property getter
 * validates on access, so importing this module never throws.
 */
export const env = new Proxy({} as Record<BankingEnvKey, string>, {
  get: (_target, prop) => read(prop as BankingEnvKey),
});

/**
 * Non-throwing check, for deciding whether a provider is usable before
 * attempting to call it.
 */
export function hasEnv(...keys: BankingEnvKey[]): boolean {
  return keys.every((key) => {
    const value = process.env[key] ?? DEFAULTS[key];
    return value !== undefined && value !== "";
  });
}
