-- Add the tables the dashboard subscribes to into the `supabase_realtime`
-- publication.
--
-- Why this migration exists: the numbered files in packages/db/migrations
-- contain `ALTER PUBLICATION supabase_realtime ADD TABLE ...` statements (see
-- 0010_add_customer_enrichment.sql and 0018_add_insights_realtime.sql), but
-- those are applied out-of-band via `db:push`, which pushes the Drizzle schema
-- and never executes them. The result was an EMPTY publication: every
-- `postgres_changes` subscription connected, reported SUBSCRIBED, and then
-- silently delivered nothing. Nothing errors -- the UI just never live-updates.
--
-- Tables are derived from the actual `useRealtime({ table: ... })` call sites:
--   customers    -- tables/customers/data-table.tsx, customer-details.tsx
--   transactions -- tables/transactions/data-table.tsx
--   documents    -- tables/vault/data-table.tsx, vault/vault-grid.tsx
--   inbox        -- inbox/inbox-view.tsx, hooks/use-upload-processing-toast.tsx
--   activities   -- hooks/use-notifications.ts
--   insights     -- realtime insight stream
--
-- Replica identity is deliberately left at DEFAULT. Every subscription listens
-- only for INSERT and/or UPDATE (the hook defaults to ["INSERT","UPDATE"] and
-- no call site asks for DELETE), and those events carry the full new row. Only
-- DELETE/old-record filtering would need REPLICA IDENTITY FULL, which doubles
-- WAL volume for no benefit here.

DO $$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'customers',
    'transactions',
    'documents',
    'inbox',
    'activities',
    'insights'
  ]
  LOOP
    -- Skip tables that don't exist yet, so this migration is safe to run
    -- against a partially-migrated database.
    IF to_regclass('public.' || target_table) IS NULL THEN
      RAISE NOTICE 'skipping %: table does not exist', target_table;
      CONTINUE;
    END IF;

    -- Idempotent: ADD TABLE errors if the table is already a member.
    IF EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = target_table
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',
      target_table
    );
  END LOOP;
END
$$;
