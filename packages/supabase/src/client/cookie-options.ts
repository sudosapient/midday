export function getAuthCookieOptions(
  supabaseUrl: string,
  publicSupabaseUrl = supabaseUrl,
) {
  const projectRef = new URL(publicSupabaseUrl).hostname.split(".")[0];

  return { name: `sb-${projectRef}-auth-token` };
}
