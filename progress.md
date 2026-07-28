# Local Container Progress

## 2026-07-28

- Confirmed the complete Supabase CLI stack is already running and healthy.
- Read all three application Dockerfiles and current local env files.
- Confirmed no existing application Compose file exists; only the isolated Postgres test compose is present.
- Started runtime contract and networking inspection before authoring Compose.
- Added an explicit `SUPABASE_AUTH_ISSUER` override so container networking does not require disabling or loosening JWT issuer validation.
- Added a server-only `SUPABASE_INTERNAL_URL` override for dashboard SSR/middleware and background Supabase clients.
- Added `compose.local.yml` for Redis, API, worker, and dashboard on the existing Supabase Docker network, with service health checks and public/internal URL separation.
- Compose configuration validates; API and dashboard typechecks pass. Worker host typecheck is blocked only by the expected generated Workbench module, which the worker image builds explicitly.
- Built all three application images successfully.
- First boot exposed eager optional bot-adapter validation in both API and worker; added inert local adapter credentials so unrelated services can boot without real provider accounts.
- Worker now boots healthy with 12 queues and 7 static schedulers registered.
- Added the internal API URL for worker callbacks and an inert local Composio key for API boot.
- API, worker, and Redis are healthy. Dashboard routes return 200; corrected its container health probe to use Compose DNS instead of refused loopback.
- Readiness testing found all DB queries failed because production mode forced TLS against local Postgres. Added an explicit self-hosted SSL opt-out and a `.dockerignore` to make rebuilds practical.
- Rebuilt the affected images; API and worker readiness now pass database, Redis, queue, and Supabase checks.
- Reproduced and fixed the Redis startup health race by awaiting the shared connection readiness promise; added and passed `packages/cache/src/health.test.ts`.
- Verified disposable-user signup, unauthenticated API rejection, authenticated JWT access, and user cleanup.
- Verified Supabase Storage REST upload/public read/delete and Bun `S3Client` upload/existence/public read/cleanup through the local S3 shim.
- Verified BullMQ dispatch and completion through `triggerJobAndWait()` and confirmed scheduled worker jobs continue completing without SSL errors.
- Verified the one-shot job database client can connect, query, and disconnect in production mode against local Supabase Postgres.
- Verified authenticated Realtime delivery for a team-owned `activities` insert and cross-team isolation with a second authenticated subscriber receiving zero events.
- Confirmed all disposable Realtime users, teams, and activity rows were cleaned up.
- Completed the full local-container integration plan. Remaining exclusions are Trigger.dev, hosted R2, and optional external provider delivery requiring real credentials.
