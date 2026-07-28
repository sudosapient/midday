-- Storage buckets + RLS policies for self-hosted deployments.
--
-- On Supabase Cloud these were created by hand in the dashboard, so nothing in
-- this repo recreated them. That made `supabase db reset` (or a fresh clone)
-- silently lose every bucket and policy. This migration is the source of truth.
--
-- Buckets, and the paths the app actually writes:
--   vault   (private) <team_id>/...                     team-scoped documents
--   avatars (public)  <user_id>/<file>                  user avatar
--                     <team_id>/<file>                  team logo
--                     <team_id>/invoice/<file>          invoice logo
--   apps    (public)  logos/<file>                      OAuth app logos

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('vault',   'vault',   false, 52428800),
  ('avatars', 'avatars', true,  10485760),
  ('apps',    'apps',    true,  10485760)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit;

-- ---------------------------------------------------------------------------
-- vault: private, team-scoped. folder[1] must be a team the caller belongs to.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS vault_select_team_path ON storage.objects;
DROP POLICY IF EXISTS vault_insert_team_path ON storage.objects;
DROP POLICY IF EXISTS vault_update_team_path ON storage.objects;
DROP POLICY IF EXISTS vault_delete_team_path ON storage.objects;

CREATE POLICY vault_select_team_path ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'vault'
    AND EXISTS (
      SELECT 1 FROM private.get_teams_for_authenticated_user() AS allowed(team_id)
      WHERE allowed.team_id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY vault_insert_team_path ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'vault'
    AND EXISTS (
      SELECT 1 FROM private.get_teams_for_authenticated_user() AS allowed(team_id)
      WHERE allowed.team_id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY vault_update_team_path ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'vault'
    AND EXISTS (
      SELECT 1 FROM private.get_teams_for_authenticated_user() AS allowed(team_id)
      WHERE allowed.team_id::text = (storage.foldername(name))[1]
    )
  )
  WITH CHECK (
    bucket_id = 'vault'
    AND EXISTS (
      SELECT 1 FROM private.get_teams_for_authenticated_user() AS allowed(team_id)
      WHERE allowed.team_id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY vault_delete_team_path ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'vault'
    AND EXISTS (
      SELECT 1 FROM private.get_teams_for_authenticated_user() AS allowed(team_id)
      WHERE allowed.team_id::text = (storage.foldername(name))[1]
    )
  );

-- ---------------------------------------------------------------------------
-- avatars: public read. Writes are keyed on folder[1], which is EITHER the
-- caller's own user id (avatar-upload.tsx) OR one of their team ids
-- (company-logo.tsx, invoice/logo.tsx). A uid-only check 403s both team cases.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.midday_owns_avatar_path(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
    AND (
      (storage.foldername(object_name))[1] = (auth.uid())::text
      OR EXISTS (
        SELECT 1 FROM private.get_teams_for_authenticated_user() AS allowed(team_id)
        WHERE allowed.team_id::text = (storage.foldername(object_name))[1]
      )
    )
$$;

DROP POLICY IF EXISTS avatars_public_select ON storage.objects;
DROP POLICY IF EXISTS avatars_insert_own_path ON storage.objects;
DROP POLICY IF EXISTS avatars_update_own_path ON storage.objects;
DROP POLICY IF EXISTS avatars_delete_own_path ON storage.objects;

CREATE POLICY avatars_public_select ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY avatars_insert_own_path ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND private.midday_owns_avatar_path(name));

CREATE POLICY avatars_update_own_path ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND private.midday_owns_avatar_path(name))
  WITH CHECK (bucket_id = 'avatars' AND private.midday_owns_avatar_path(name));

CREATE POLICY avatars_delete_own_path ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND private.midday_owns_avatar_path(name));

-- ---------------------------------------------------------------------------
-- apps: public read. Writes go to the literal prefix "logos/", which contains
-- no id at all, so the path cannot be ownership-checked. Any authenticated
-- user may add an app logo; filenames are nanoid so collisions aren't a risk.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS apps_public_select ON storage.objects;
DROP POLICY IF EXISTS apps_insert_own_path ON storage.objects;
DROP POLICY IF EXISTS apps_update_own_path ON storage.objects;
DROP POLICY IF EXISTS apps_delete_own_path ON storage.objects;
DROP POLICY IF EXISTS apps_insert_logos ON storage.objects;
DROP POLICY IF EXISTS apps_update_logos ON storage.objects;
DROP POLICY IF EXISTS apps_delete_logos ON storage.objects;

CREATE POLICY apps_public_select ON storage.objects
  FOR SELECT USING (bucket_id = 'apps');

CREATE POLICY apps_insert_logos ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'apps' AND (storage.foldername(name))[1] = 'logos');

CREATE POLICY apps_update_logos ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'apps' AND (storage.foldername(name))[1] = 'logos')
  WITH CHECK (bucket_id = 'apps' AND (storage.foldername(name))[1] = 'logos');

CREATE POLICY apps_delete_logos ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'apps' AND (storage.foldername(name))[1] = 'logos');
