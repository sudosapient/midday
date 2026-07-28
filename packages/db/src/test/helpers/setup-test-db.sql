-- Prerequisites for drizzle-kit push on a bare Postgres instance.
-- Only creates extensions, schemas, and stub functions that Supabase
-- provides in production but don't exist in a vanilla PG container.
-- All tables/enums/indexes are handled by drizzle-kit push.

CREATE EXTENSION IF NOT EXISTS vector;
-- Required by the trigram indexes in schema.ts (gin_trgm_ops).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS private;

-- Roles the RLS policies in schema.ts grant to. Supabase creates these; a
-- vanilla Postgres container does not.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
END
$$;

-- Stubs for a vanilla PG container ONLY.
--
-- These are deliberately NOT `CREATE OR REPLACE` at top level: this script is
-- also run by `db:bootstrap` against a real local Supabase instance, where an
-- unconditional replace would overwrite GoTrue's genuine `auth.uid()` with a
-- constant and stub `get_teams_for_authenticated_user()` to return zero rows.
-- That breaks Realtime and Storage silently (every RLS check denies) while the
-- API keeps working, because the API connects as superuser and bypasses RLS.
-- Only define what is missing.
DO $$
BEGIN
  IF to_regprocedure('auth.uid()') IS NULL THEN
    CREATE FUNCTION auth.uid() RETURNS uuid
      LANGUAGE sql AS $fn$ SELECT '00000000-0000-0000-0000-000000000000'::uuid $fn$;
  END IF;

  IF to_regprocedure('auth.jwt()') IS NULL THEN
    CREATE FUNCTION auth.jwt() RETURNS jsonb
      LANGUAGE sql AS $fn$ SELECT '{}'::jsonb $fn$;
  END IF;

  IF to_regprocedure('private.get_teams_for_authenticated_user()') IS NULL THEN
    CREATE FUNCTION private.get_teams_for_authenticated_user()
      RETURNS SETOF uuid LANGUAGE sql
      AS $fn$ SELECT '00000000-0000-0000-0000-000000000000'::uuid LIMIT 0 $fn$;
  END IF;
END
$$;

-- Not CREATE OR REPLACE: the real implementation in
-- supabase/migrations/20260715000000_local_bootstrap.sql aggregates product
-- names out of the JSON, and replacing it with this '' stub would silently
-- empty the inbox full-text index on a real Supabase database.
DO $$
BEGIN
  IF to_regprocedure('public.extract_product_names(json)') IS NULL THEN
    CREATE FUNCTION extract_product_names(data json)
      RETURNS text LANGUAGE sql AS $fn$ SELECT '' $fn$;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION generate_inbox_fts(name text, products text)
  RETURNS tsvector LANGUAGE sql
  AS $$ SELECT to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(products, '')) $$;

-- Default for inbox.inbox_id. Mirrors the definition in
-- supabase/migrations/20260715000000_local_bootstrap.sql.
CREATE OR REPLACE FUNCTION generate_inbox(length integer)
  RETURNS text LANGUAGE sql VOLATILE
  AS $$
    SELECT string_agg(
      substr('abcdefghijklmnopqrstuvwxyz0123456789',
             floor(random() * 36 + 1)::integer, 1), '')
    FROM generate_series(1, length)
  $$;
