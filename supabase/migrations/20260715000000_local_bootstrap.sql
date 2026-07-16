-- Local Supabase prerequisites that are managed outside Drizzle in production.
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.get_teams_for_authenticated_user()
RETURNS SETOF uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT users_on_team.team_id
  FROM public.users_on_team
  WHERE users_on_team.user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.extract_product_names(data json)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(string_agg(item->>'name', ' '), '')
  FROM json_array_elements(COALESCE(data, '[]'::json)) AS item
$$;

CREATE OR REPLACE FUNCTION public.generate_inbox_fts(name text, products text)
RETURNS tsvector
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT to_tsvector(
    'english',
    COALESCE(name, '') || ' ' || COALESCE(products, '')
  )
$$;

CREATE OR REPLACE FUNCTION public.generate_inbox(length integer)
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT string_agg(
    substr(
      'abcdefghijklmnopqrstuvwxyz0123456789',
      floor(random() * 36 + 1)::integer,
      1
    ),
    ''
  )
  FROM generate_series(1, length)
$$;

CREATE OR REPLACE FUNCTION public.global_search(
  search_term text,
  team_id uuid,
  language text,
  max_results integer,
  items_per_table_limit integer,
  relevance_threshold double precision
)
RETURNS TABLE (
  id uuid,
  type text,
  title text,
  relevance double precision,
  created_at timestamptz,
  data jsonb
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    NULL::uuid,
    NULL::text,
    NULL::text,
    NULL::double precision,
    NULL::timestamptz,
    NULL::jsonb
  WHERE false
$$;

CREATE OR REPLACE FUNCTION public.global_semantic_search(
  team_id uuid,
  search_term text,
  start_date text,
  end_date text,
  types text[],
  amount numeric,
  amount_min numeric,
  amount_max numeric,
  status text,
  currency text,
  language text,
  due_date_start text,
  due_date_end text,
  max_results integer,
  items_per_table_limit integer
)
RETURNS TABLE (
  id uuid,
  type text,
  title text,
  relevance double precision,
  created_at timestamptz,
  data jsonb
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    NULL::uuid,
    NULL::text,
    NULL::text,
    NULL::double precision,
    NULL::timestamptz,
    NULL::jsonb
  WHERE false
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name'
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    )
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE OF email, raw_user_meta_data ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
