const requiredVariables = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_INTERNAL_URL",
  "SUPABASE_AUTH_ISSUER",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "DATABASE_PRIMARY_URL",
  "DATABASE_PRIMARY_POOLER_URL",
  "DATABASE_SESSION_POOLER",
  "R2_ENDPOINT",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
] as const;

type CloudSupabaseEnv = Partial<
  Record<(typeof requiredVariables)[number], string>
>;

function getProjectRef(url: string, storage = false) {
  const hostname = new URL(url).hostname;
  const suffix = storage ? ".storage.supabase.co" : ".supabase.co";

  return hostname.endsWith(suffix) ? hostname.slice(0, -suffix.length) : null;
}

function isBaseUrl(url: URL) {
  return (
    (url.pathname === "/" || url.pathname === "") && !url.search && !url.hash
  );
}

function validateDatabaseUrl(
  variable: keyof CloudSupabaseEnv,
  value: string,
  projectRef: string | null,
) {
  try {
    const url = new URL(value);
    const localHosts = new Set(["db", "localhost", "127.0.0.1", "::1"]);
    const usernameProjectRef = url.username.split(".")[1];
    const hostProjectRef = url.hostname.split(".")[0];
    const belongsToProject =
      projectRef &&
      (usernameProjectRef === projectRef || hostProjectRef === projectRef);

    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      localHosts.has(url.hostname) ||
      !belongsToProject
    ) {
      return `${variable} must use a hosted database`;
    }
  } catch {
    return `${variable} must be a valid PostgreSQL URL`;
  }
}

export function validateCloudSupabaseEnv(env: CloudSupabaseEnv) {
  const errors: string[] = [];

  for (const variable of requiredVariables) {
    if (!env[variable]) errors.push(`${variable} is required`);
  }

  if (errors.length > 0) return errors;

  const publicUrl = env.NEXT_PUBLIC_SUPABASE_URL!;
  let projectRef: string | null = null;

  try {
    projectRef = getProjectRef(publicUrl);
  } catch {
    errors.push("NEXT_PUBLIC_SUPABASE_URL must be a valid URL");
  }
  const supabaseUrls = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_URL",
    "SUPABASE_INTERNAL_URL",
  ] as const;

  for (const variable of supabaseUrls) {
    const value = env[variable]!;
    let url: URL;

    try {
      url = new URL(value);
    } catch {
      errors.push(`${variable} must be a valid URL`);
      continue;
    }

    if (url.protocol !== "https:") {
      errors.push(`${variable} must use HTTPS`);
    }

    if (!isBaseUrl(url)) {
      errors.push(`${variable} must be a Supabase base URL`);
    }

    if (!projectRef || getProjectRef(value) !== projectRef) {
      errors.push(`${variable} must belong to the same Supabase project`);
    }
  }

  if (
    projectRef &&
    env.SUPABASE_AUTH_ISSUER !== `${publicUrl.replace(/\/+$/, "")}/auth/v1`
  ) {
    errors.push(
      "SUPABASE_AUTH_ISSUER must match NEXT_PUBLIC_SUPABASE_URL/auth/v1",
    );
  }

  try {
    const storageUrl = new URL(env.R2_ENDPOINT!);
    if (storageUrl.protocol !== "https:") {
      errors.push("R2_ENDPOINT must use HTTPS");
    }
    if (storageUrl.pathname.replace(/\/+$/, "") !== "/storage/v1/s3") {
      errors.push("R2_ENDPOINT must end with /storage/v1/s3");
    }
    if (!projectRef || getProjectRef(env.R2_ENDPOINT!, true) !== projectRef) {
      errors.push("R2_ENDPOINT must belong to the same Supabase project");
    }
  } catch {
    errors.push("R2_ENDPOINT must be a valid URL");
  }

  if (env.R2_BUCKET_NAME !== "apps") {
    errors.push("R2_BUCKET_NAME must be apps");
  }

  const databaseVariables = [
    "DATABASE_PRIMARY_URL",
    "DATABASE_PRIMARY_POOLER_URL",
    "DATABASE_SESSION_POOLER",
  ] as const;

  for (const variable of databaseVariables) {
    const error = validateDatabaseUrl(variable, env[variable]!, projectRef);
    if (error) errors.push(error);
  }

  return errors;
}

if (import.meta.main) {
  const errors = validateCloudSupabaseEnv(process.env);

  if (errors.length > 0) {
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log("Cloud Supabase environment is valid");
}
