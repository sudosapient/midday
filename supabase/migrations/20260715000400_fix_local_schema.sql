-- Align columns created by the local Drizzle bootstrap with the application's
-- snake_case runtime configuration. Renames preserve any existing data.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bank_accounts'
      AND column_name = 'baseBalance'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bank_accounts'
      AND column_name = 'base_balance'
  ) THEN
    ALTER TABLE public.bank_accounts RENAME COLUMN "baseBalance" TO base_balance;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bank_accounts'
      AND column_name = 'availableBalance'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bank_accounts'
      AND column_name = 'available_balance'
  ) THEN
    ALTER TABLE public.bank_accounts RENAME COLUMN "availableBalance" TO available_balance;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bank_accounts'
      AND column_name = 'creditLimit'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bank_accounts'
      AND column_name = 'credit_limit'
  ) THEN
    ALTER TABLE public.bank_accounts RENAME COLUMN "creditLimit" TO credit_limit;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'customers'
      AND column_name = 'billingEmail'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'customers'
      AND column_name = 'billing_email'
  ) THEN
    ALTER TABLE public.customers RENAME COLUMN "billingEmail" TO billing_email;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invoice_products'
      AND column_name = 'isActive'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invoice_products'
      AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.invoice_products RENAME COLUMN "isActive" TO is_active;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'transactions'
      AND column_name = 'baseAmount'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'transactions'
      AND column_name = 'base_amount'
  ) THEN
    ALTER TABLE public.transactions RENAME COLUMN "baseAmount" TO base_amount;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.total_duration(
  project public.tracker_projects
)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(entry.duration), 0)::bigint
  FROM public.tracker_entries AS entry
  WHERE entry.project_id = project.id;
$$;

CREATE OR REPLACE FUNCTION public.get_project_total_amount(
  project public.tracker_projects
)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    CASE
      WHEN project.rate IS NOT NULL
        THEN ROUND(COALESCE(SUM(entry.duration), 0) * project.rate / 3600, 2)
      ELSE 0
    END,
    0
  )
  FROM public.tracker_entries AS entry
  WHERE entry.project_id = project.id;
$$;

GRANT EXECUTE ON FUNCTION public.total_duration(public.tracker_projects)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_project_total_amount(public.tracker_projects)
  TO anon, authenticated, service_role;
