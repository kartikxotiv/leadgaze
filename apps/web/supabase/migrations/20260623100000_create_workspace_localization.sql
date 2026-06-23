/*
 * -------------------------------------------------------
 * Migration: Create Workspace Localization Tables
 * Date: 2026-06-23
 * Description: Creates database structure for workspace-level localization
 * preferences (timezone, date/time format, currency) and multi-currency support
 * with exchange rate tracking.
 * -------------------------------------------------------
 */

-- =====================================================
-- 1. ENSURE updated_at TRIGGER FUNCTION EXISTS
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- 2. WORKSPACE PREFERENCES (1:1 with workspace)
-- Stores timezone, date format, time format, default currency
-- =====================================================

CREATE TABLE IF NOT EXISTS public.workspace_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Each workspace has exactly one preferences row
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Localization settings
  timezone TEXT NOT NULL DEFAULT 'UTC',
  date_format TEXT NOT NULL DEFAULT 'MM-DD-YYYY',
  time_format TEXT NOT NULL DEFAULT '12h',

  -- Default workspace currency
  default_currency CHAR(3) NOT NULL DEFAULT 'USD',

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_workspace_preferences_workspace ON public.workspace_preferences(workspace_id);

-- RLS
ALTER TABLE public.workspace_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_preferences_select
  ON public.workspace_preferences FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY workspace_preferences_insert
  ON public.workspace_preferences FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY workspace_preferences_update
  ON public.workspace_preferences FOR UPDATE TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

-- Grants
REVOKE ALL ON public.workspace_preferences FROM authenticated;
GRANT SELECT, UPDATE ON public.workspace_preferences TO authenticated;
GRANT ALL ON public.workspace_preferences TO service_role;

-- Trigger
CREATE TRIGGER trg_workspace_preferences_updated_at
  BEFORE UPDATE ON public.workspace_preferences
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

COMMENT ON TABLE public.workspace_preferences IS 'Workspace-level localization preferences: timezone, date/time format, and default currency';

-- =====================================================
-- 3. WORKSPACE CURRENCIES (1:many per workspace)
-- Tracks which currencies a workspace supports
-- =====================================================

CREATE TABLE IF NOT EXISTS public.workspace_currencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Currency details
  currency_code CHAR(3) NOT NULL,
  currency_symbol VARCHAR(10) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each workspace can only have one row per currency code
  CONSTRAINT workspace_currencies_unique UNIQUE (workspace_id, currency_code)
);

-- Indexes
CREATE INDEX idx_workspace_currencies_workspace ON public.workspace_currencies(workspace_id);
CREATE INDEX idx_workspace_currencies_active ON public.workspace_currencies(workspace_id) WHERE is_active = TRUE;

-- RLS
ALTER TABLE public.workspace_currencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_currencies_select
  ON public.workspace_currencies FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY workspace_currencies_insert
  ON public.workspace_currencies FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY workspace_currencies_update
  ON public.workspace_currencies FOR UPDATE TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY workspace_currencies_delete
  ON public.workspace_currencies FOR DELETE TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

-- Grants
REVOKE ALL ON public.workspace_currencies FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_currencies TO authenticated;
GRANT ALL ON public.workspace_currencies TO service_role;

COMMENT ON TABLE public.workspace_currencies IS 'Currencies enabled for each workspace, with symbol and default flag';

-- =====================================================
-- 4. CURRENCY EXCHANGE RATES
-- Historical exchange rates between currency pairs
-- =====================================================

CREATE TABLE IF NOT EXISTS public.currency_exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  base_currency CHAR(3) NOT NULL,
  target_currency CHAR(3) NOT NULL,
  exchange_rate NUMERIC(18,8) NOT NULL,

  -- Source of the rate
  provider TEXT NOT NULL DEFAULT 'manual',

  -- When the rate was fetched / is valid from
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  -- Prevent duplicate rates for the same currency pair at the same instant
  CONSTRAINT currency_exchange_rates_unique UNIQUE (base_currency, target_currency, fetched_at)
);

-- Indexes for fast lookups
CREATE INDEX idx_currency_exchange_rates_pair ON public.currency_exchange_rates(base_currency, target_currency);
CREATE INDEX idx_currency_exchange_rates_latest ON public.currency_exchange_rates(base_currency, target_currency, fetched_at DESC);

-- RLS
ALTER TABLE public.currency_exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY currency_exchange_rates_select
  ON public.currency_exchange_rates FOR SELECT TO authenticated
  USING (true);

CREATE POLICY currency_exchange_rates_insert
  ON public.currency_exchange_rates FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY currency_exchange_rates_update
  ON public.currency_exchange_rates FOR UPDATE TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY currency_exchange_rates_delete
  ON public.currency_exchange_rates FOR DELETE TO service_role
  USING (true);

-- Grants
REVOKE ALL ON public.currency_exchange_rates FROM authenticated;
GRANT SELECT ON public.currency_exchange_rates TO authenticated;
GRANT ALL ON public.currency_exchange_rates TO service_role;

COMMENT ON TABLE public.currency_exchange_rates IS 'Historical exchange rates between currency pairs. Rates are immutable once inserted -- new rates are added, old ones are never modified.';

-- =====================================================
-- 5. SEED DATA: Common Currencies
-- Inserted as defaults; workspaces can enable/disable as needed
-- =====================================================

-- Note: These are template rows. Actual workspace currencies are created
-- when a workspace opts in via the settings UI.
-- This seed data is for reference and for the currency_exchange_rates table.

-- Seed baseline exchange rates (relative to USD = 1.0)
INSERT INTO public.currency_exchange_rates (base_currency, target_currency, exchange_rate, provider, fetched_at)
VALUES
  ('USD', 'USD', 1.00000000, 'seed', NOW()),
  ('USD', 'EUR', 0.92000000, 'seed', NOW()),
  ('USD', 'GBP', 0.79000000, 'seed', NOW()),
  ('USD', 'INR', 83.12000000, 'seed', NOW()),
  ('USD', 'AED', 3.67250000, 'seed', NOW()),
  ('USD', 'CAD', 1.36000000, 'seed', NOW()),
  ('USD', 'AUD', 1.53000000, 'seed', NOW()),
  ('USD', 'JPY', 149.50000000, 'seed', NOW()),
  ('USD', 'SGD', 1.34000000, 'seed', NOW()),
  ('USD', 'CHF', 0.88000000, 'seed', NOW()),
  ('EUR', 'USD', 1.08695652, 'seed', NOW()),
  ('EUR', 'GBP', 0.85869565, 'seed', NOW()),
  ('EUR', 'INR', 90.34782609, 'seed', NOW()),
  ('GBP', 'USD', 1.26582278, 'seed', NOW()),
  ('GBP', 'EUR', 1.16455696, 'seed', NOW()),
  ('GBP', 'INR', 105.21518987, 'seed', NOW()),
  ('INR', 'USD', 0.01203080, 'seed', NOW()),
  ('INR', 'EUR', 0.01106833, 'seed', NOW()),
  ('INR', 'GBP', 0.00950414, 'seed', NOW()),
  ('AED', 'USD', 0.27229508, 'seed', NOW())
ON CONFLICT (base_currency, target_currency, fetched_at) DO NOTHING;
