# Local Container Findings

- Local Supabase is healthy: Kong/API `54321`, Postgres `54322`, Studio `54323`, Mailpit `54324`, Analytics `54327`.
- Existing app env files use host loopback addresses. Containers cannot use their own `127.0.0.1` to reach Supabase/Postgres/Redis; Compose needs container-reachable addresses.
- Dashboard public URLs are build-time values and must remain browser-reachable (`localhost`), while server-side calls may need an internal override if the code supports one.
- API image listens on its `PORT` environment variable; Dockerfile default is `8080`.
- Worker image listens on its `PORT` environment variable; Dockerfile default is `8080`.
- Dashboard image listens on container port `3000`.
- Supabase Storage S3 protocol credentials are available from `supabase status -o env`.
- JWT verification originally derived both expected issuer and JWKS network URL from `SUPABASE_URL`. Those differ in containers: issuer remains the browser-facing host URL, while JWKS must be reached over Docker networking. Added `SUPABASE_AUTH_ISSUER` as a strict issuer override; JWKS still comes from internal `SUPABASE_URL`.
- Dashboard server components and middleware previously always used `NEXT_PUBLIC_SUPABASE_URL`. Added `SUPABASE_INTERNAL_URL` for server-side Supabase clients while leaving the browser client on the public host URL.
- Local credentials are kept in ignored `.env.compose.local`; the tracked Compose file contains topology and non-secret runtime configuration only.
- Database SSL was tied only to `NODE_ENV`, making production-built self-hosted containers unable to query a non-TLS local Postgres. Added an explicit opt-out (`DATABASE_SSL_DISABLED=true`).
- The repository had no `.dockerignore`; initial build context was 8.1 GB. Added one to exclude Git metadata, dependencies, build outputs, local env files, and planning artifacts.
- Redis readiness could race the initial connection because offline queuing is disabled. Health checks now await the shared Redis readiness promise before issuing `PING`.
- Supabase Realtime requires the authenticated access token to be applied with `realtime.setAuth()` before channel subscription in the standalone smoke client. With that sequence, an owning team received its `activities` insert and another authenticated team received zero events.
- The `supabase_realtime` publication and authenticated SELECT/RLS policies cover the six dashboard-subscribed tables: `activities`, `customers`, `documents`, `inbox`, `insights`, and `transactions`.
- The primary API DB pool, worker DB pool, and one-shot job DB client all query local Supabase Postgres successfully with the explicit SSL opt-out.
- The final stack is operational without Trigger.dev or hosted R2. Optional bot, Composio, and external messaging delivery still require real provider credentials and were not exercised.
- Browser QA completed onboarding successfully after the auth-cookie fix and
  found no reproducible 401, 403, 500, or CORS failures in tested core flows.
- The invoices empty state renders `Unknown`; direct navigation to
  `/invoices/new` redirects to `/`, so invoice creation needs focused diagnosis.
- Onboarding emits React warnings that a Select changes from uncontrolled to
  controlled. One generic `TRPCClientError` was observed without a correlated
  failed request or visible breakage.
- Cloud Supabase URLs are supported by the application clients, but the current
  `compose.local.yml` overrides env-file values with local-only networking and
  TLS settings. A separate override is needed for safe switching and testing.
- Hosted database URLs can share a pooler hostname, so project identity must be
  checked from either the `postgres.PROJECT_REF` username or a project-specific
  database hostname rather than the hostname alone.
- The first final-QA OTP request returned 504 because Docker DNS briefly failed
  to resolve `supabase_db_midday-mod`; an immediate retry returned 200 and
  delivered the OTP, confirming an infrastructure transient rather than a form
  regression.
