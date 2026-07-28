# Local Container Test Plan

## Goal

Build and run Midday's API, dashboard, worker, and Redis as real local containers against the existing local Supabase stack, then exercise the critical system paths end to end.

## Phases

1. **Inspect runtime contracts** — complete
   - Confirm container ports, environment variables, Supabase network, auth/JWT behavior, and health endpoints.
2. **Author local Compose stack** — complete
   - Add API, dashboard, worker, and Redis with health checks and correct host/container URLs.
3. **Build and boot** — complete
   - Build all application images and start the stack.
4. **Integration tests** — complete
   - Test service health, database access, auth, API authorization, Storage HTTP + S3, Redis/worker, dashboard rendering, and Realtime delivery.
5. **Fix and retest** — complete
   - Resolve failures, rebuild affected services, and repeat until stable.

## Decisions

- Supabase remains owned by `supabase start`; Compose owns only application services and Redis.
- Trigger.dev is intentionally excluded.
- Tests must use actual containers, not host-run app processes.

## Errors Encountered

| Error | Resolution |
|---|---|
| Scape capability probe unavailable | Continue with Docker CLI and repository tools in the current shell session. |
| `apps/worker/.env` missing | Compose will provide the worker environment explicitly from the verified API/local settings. |
| Worker host typecheck cannot resolve generated `workbench/hono` | Worker Dockerfile builds `packages/workbench` before runtime; validate through the image build, where the generated module exists. |
| API and worker crashed because `@midday/bot` eagerly validates optional adapter credentials at import time | Supply inert local adapter credentials for the container test; external bot delivery remains intentionally untested without real provider accounts. |
| API crashed because the Composio SDK is eagerly constructed without a key | Supply an inert local key for boot; external Composio actions remain intentionally untested. |
| Dashboard health probe could not connect to container loopback although published routes returned 200 | Probe the service through its Compose DNS name (`dashboard:3000/api/health`). |
| Production-mode DB clients forced TLS against local Supabase Postgres | Added explicit `DATABASE_SSL_DISABLED=true` support for self-hosted/local Postgres while keeping production TLS as the default. |
| Redis cache readiness intermittently failed before the shared client connected | Made `RedisCache.healthCheck()` await `waitForRedisReady()` and added a regression test. |
| Initial Realtime smoke test subscribed without delivering an event | Explicitly set the authenticated Realtime token before subscribing; verified delivery and cross-team RLS isolation. |

## Final Verification

- API, dashboard, worker, and Redis production containers are healthy.
- API and worker readiness probes pass database, Redis, queue, and Supabase checks.
- Dashboard login and health routes return HTTP 200.
- Authenticated API access, Storage REST, Storage S3, BullMQ execution, scheduled worker jobs, and all three database client variants were exercised successfully.
- Realtime delivers team-owned activity inserts and does not deliver them to another authenticated team.
- Trigger.dev, hosted R2, and optional external provider delivery remain excluded by design.

## Follow-up: Invoice, UI Issues, and Cloud Supabase

### Goal

Make invoice creation and empty states reliable, remove the confirmed onboarding
console warnings and actionable client errors, add a safe Cloud Supabase Compose
mode, and verify the changes through automated checks and browser testing.

### Phases

1. **Publish verified baseline** — complete
   - Commit and push the auth-cookie fix and Supabase deployment documentation.
2. **Parallel diagnosis** — complete
   - Diagnose invoice routing/empty-state behavior, onboarding warnings, and Cloud
     Supabase configuration independently.
3. **Test-first fixes** — complete
   - Add failing regression tests, implement the smallest fixes, and run focused
     package checks.
4. **Cloud Supabase verification** — blocked on hosted credentials
   - Add a Compose override and validate it against a real hosted project when
     credentials are available; otherwise validate configuration statically and
     report the exact credential blocker.
5. **Browser regression pass** — complete
   - Re-test invoices, onboarding, session persistence, console/network errors,
     and key workflows on desktop and mobile.
6. **Publish final changes** — pending user request
   - Review the diff, commit, push to `sudosapient/midday-mod`, and report residual
     risks.

### Follow-up Errors

| Error | Resolution |
|---|---|
| Initial push rejected with HTTP 403 under `sabari8956` | Switched to the configured `sudosapient` account, pushed commit `25caa7fa9`, then restored `sabari8956`. |
