-- SELECT policies for the tables the dashboard subscribes to over Realtime.
--
-- Why this is needed: all 49 public tables have `ALTER TABLE ... ENABLE ROW
-- LEVEL SECURITY` applied but ZERO policies exist in the database, which means
-- default-deny. The API is unaffected (it connects as a superuser via pg.Pool
-- and never SET ROLE, so RLS is bypassed entirely), which is exactly why this
-- went unnoticed -- but Realtime DOES enforce RLS: it re-checks every WAL row
-- against the subscriber's JWT as the `authenticated` role. With no SELECT
-- policy, every change is filtered out and subscriptions deliver nothing while
-- still reporting SUBSCRIBED.
--
-- Scope is deliberately limited to SELECT on the six subscribed tables. The
-- `pgPolicy(...)` declarations in packages/db/src/schema.ts are NOT usable as-is:
-- their select/update/delete variants omit the `using` clause entirely (only the
-- insert variants carry `withCheck`), so materializing them verbatim would
-- produce `USING (true)` and expose every team's rows to every authenticated
-- user. Writing the team-scoped predicate explicitly here avoids that.
--
-- Writes continue to go through the API's superuser connection, so no
-- INSERT/UPDATE/DELETE policies are added -- keeping this migration
-- least-privilege rather than broadly re-enabling table access.
--
-- A policy alone is NOT sufficient: RLS narrows access that a GRANT has already
-- given, it never grants anything itself. The `authenticated` role currently has
-- SELECT on ZERO public tables (only `service_role` is granted, on all 49), so
-- without the GRANT below Realtime fails with "permission denied for table ..."
-- before RLS is ever consulted. Both halves are required.

-- customers, transactions, documents, inbox, insights: plain team scoping.
DO $$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'customers',
    'transactions',
    'documents',
    'inbox',
    'insights'
  ]
  LOOP
    IF to_regclass('public.' || target_table) IS NULL THEN
      RAISE NOTICE 'skipping %: table does not exist', target_table;
      CONTINUE;
    END IF;

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      target_table || '_select_team_members', target_table
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated '
      || 'USING (team_id IN (SELECT private.get_teams_for_authenticated_user()))',
      target_table || '_select_team_members', target_table
    );

    EXECUTE format(
      'GRANT SELECT ON public.%I TO authenticated', target_table
    );
  END LOOP;
END
$$;

-- activities is subscribed with `filter: user_id=eq.<me>` (see
-- hooks/use-notifications.ts), so it is scoped to the calling user's own rows
-- within their teams rather than to the whole team.
DROP POLICY IF EXISTS activities_select_own ON public.activities;

CREATE POLICY activities_select_own ON public.activities
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND team_id IN (SELECT private.get_teams_for_authenticated_user())
  );

GRANT SELECT ON public.activities TO authenticated;
