#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

./scripts/cloud-agent-docker.sh

export PATH="${HOME}/.bun/bin:${PATH}"

LAST_MIGRATION="supabase/migrations/20260715000400_fix_local_schema.sql"
MIGRATION_BACKUP="/tmp/midday-last-supabase-migration.sql"

if ! bunx supabase status >/dev/null 2>&1; then
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
      bun run db:setup
  )

  if [[ -f "$MIGRATION_BACKUP" ]]; then
    mv "$MIGRATION_BACKUP" "$LAST_MIGRATION"
    bunx supabase migration up
  fi
fi

for _ in $(seq 1 60); do
  if bunx supabase status >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

if ! bunx supabase start; then
  sleep 5
  bunx supabase start
fi
