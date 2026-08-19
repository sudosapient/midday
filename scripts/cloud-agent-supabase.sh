#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export PATH="${HOME}/.bun/bin:${PATH}"

LAST_MIGRATION="supabase/migrations/20260715000400_fix_local_schema.sql"
MIGRATION_BACKUP="/tmp/midday-last-supabase-migration.sql"

bunx supabase stop >/dev/null 2>&1 || true

if [[ -f "$LAST_MIGRATION" ]]; then
  cp "$LAST_MIGRATION" "$MIGRATION_BACKUP"
  rm "$LAST_MIGRATION"
fi

if ! bunx supabase db start; then
  if [[ -f "$MIGRATION_BACKUP" ]]; then
    mv "$MIGRATION_BACKUP" "$LAST_MIGRATION"
  fi
  exit 1
fi

(
  cd packages/db
  DATABASE_SESSION_POOLER="postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
    bun run db:bootstrap
  DATABASE_SESSION_POOLER="postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
    bunx drizzle-kit push --config=drizzle.config.push.ts --force
)

if [[ -f "$MIGRATION_BACKUP" ]]; then
  mv "$MIGRATION_BACKUP" "$LAST_MIGRATION"
  bunx supabase migration up
fi

for _ in $(seq 1 90); do
  if bunx supabase start >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

bunx supabase status >/dev/null
