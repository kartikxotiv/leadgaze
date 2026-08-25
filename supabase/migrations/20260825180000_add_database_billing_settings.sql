/*
 * Store backend billing timing configuration in the database.
 *
 * This is additive and does not modify any previous migration. Runtime billing
 * code reads these rows with the service-role client; browser clients have no
 * access to billing configuration.
 */

BEGIN;

CREATE TABLE public.billing_settings (
  setting_key TEXT PRIMARY KEY,
  value_days INTEGER NOT NULL,
  description TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT billing_settings_supported_key_check CHECK (
    setting_key IN (
      'invoice_due_days',
      'renewal_invoice_days',
      'grace_period_days'
    )
  ),
  CONSTRAINT billing_settings_value_check CHECK (
    (
      setting_key IN ('invoice_due_days', 'renewal_invoice_days')
      AND value_days BETWEEN 1 AND 365
    )
    OR (
      setting_key = 'grace_period_days'
      AND value_days BETWEEN 0 AND 365
    )
  )
);

COMMENT ON TABLE public.billing_settings IS
  'Backend-owned billing timing configuration. Values are measured in whole days.';
COMMENT ON COLUMN public.billing_settings.setting_key IS
  'A supported global billing setting identifier.';
COMMENT ON COLUMN public.billing_settings.value_days IS
  'The configured number of whole days.';

INSERT INTO public.billing_settings (setting_key, value_days, description)
VALUES
  (
    'invoice_due_days',
    7,
    'Number of days before a newly issued invoice is due.'
  ),
  (
    'renewal_invoice_days',
    7,
    'Number of days before period end that a renewal invoice is created.'
  ),
  (
    'grace_period_days',
    7,
    'Number of days after period end before unpaid access expires.'
  );

CREATE TRIGGER billing_settings_updated_at
BEFORE UPDATE ON public.billing_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.billing_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.billing_settings FROM anon, authenticated, service_role;
GRANT SELECT, UPDATE ON public.billing_settings TO service_role;

COMMIT;
