-- Migration: Create Workspace Localization and Currency Tables
-- Date: 2026-06-22

CREATE TABLE IF NOT EXISTS core.workspace_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID UNIQUE NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  date_format TEXT NOT NULL DEFAULT 'YYYY-MM-DD',
  time_format TEXT NOT NULL DEFAULT '24h',
  default_currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.workspace_currencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  currency_code TEXT NOT NULL,
  currency_symbol TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT workspace_currencies_unique UNIQUE (workspace_id, currency_code)
);

CREATE TABLE IF NOT EXISTS core.currency_exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  exchange_rate NUMERIC(18,8) NOT NULL,
  provider TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  CONSTRAINT currency_exchange_rates_unique UNIQUE (base_currency, target_currency)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workspace_preferences_workspace ON core.workspace_preferences(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_currencies_workspace ON core.workspace_currencies(workspace_id);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS set_core_workspace_preferences_updated_at ON core.workspace_preferences;
CREATE TRIGGER set_core_workspace_preferences_updated_at BEFORE UPDATE ON core.workspace_preferences FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

DROP TRIGGER IF EXISTS set_core_workspace_currencies_updated_at ON core.workspace_currencies;
CREATE TRIGGER set_core_workspace_currencies_updated_at BEFORE UPDATE ON core.workspace_currencies FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-- RLS
ALTER TABLE core.workspace_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.workspace_currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.currency_exchange_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_preferences_policy ON core.workspace_preferences;
CREATE POLICY workspace_preferences_policy ON core.workspace_preferences FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS workspace_currencies_policy ON core.workspace_currencies;
CREATE POLICY workspace_currencies_policy ON core.workspace_currencies FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS currency_exchange_rates_policy ON core.currency_exchange_rates;
CREATE POLICY currency_exchange_rates_policy ON core.currency_exchange_rates FOR ALL USING (true) WITH CHECK (true);

-- Permissions
GRANT ALL ON ALL TABLES IN SCHEMA core TO authenticated, service_role, anon;

-- Auto-seed function & trigger for new workspaces
CREATE OR REPLACE FUNCTION core.handle_workspace_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO core.workspace_preferences (workspace_id, timezone, date_format, time_format, default_currency)
  VALUES (NEW.id, 'UTC', 'YYYY-MM-DD', '24h', 'USD')
  ON CONFLICT (workspace_id) DO NOTHING;

  INSERT INTO core.workspace_currencies (workspace_id, currency_code, currency_symbol, is_default, is_active)
  VALUES (NEW.id, 'USD', '$', true, true)
  ON CONFLICT (workspace_id, currency_code) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_workspace_created ON public.workspaces;
CREATE TRIGGER on_workspace_created
  AFTER INSERT ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION core.handle_workspace_created();

-- Backfill existing workspaces
INSERT INTO core.workspace_preferences (workspace_id, timezone, date_format, time_format, default_currency)
SELECT id, 'UTC', 'YYYY-MM-DD', '24h', 'USD' FROM public.workspaces
ON CONFLICT (workspace_id) DO NOTHING;

INSERT INTO core.workspace_currencies (workspace_id, currency_code, currency_symbol, is_default, is_active)
SELECT id, 'USD', '$', true, true FROM public.workspaces
ON CONFLICT (workspace_id, currency_code) DO NOTHING;
