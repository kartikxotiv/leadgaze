BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(6);

SELECT has_table('public', 'billing_settings', 'billing settings table exists');

SELECT is(
  (SELECT value_days FROM public.billing_settings WHERE setting_key = 'invoice_due_days'),
  7,
  'invoice due days defaults to seven'
);

SELECT is(
  (SELECT value_days FROM public.billing_settings WHERE setting_key = 'renewal_invoice_days'),
  7,
  'renewal invoice lead days defaults to seven'
);

SELECT is(
  (SELECT value_days FROM public.billing_settings WHERE setting_key = 'grace_period_days'),
  7,
  'grace period defaults to seven days'
);

SELECT throws_ok(
  $$UPDATE public.billing_settings SET value_days = 0 WHERE setting_key = 'invoice_due_days'$$,
  '23514',
  NULL,
  'invoice due days must be positive'
);

SELECT throws_ok(
  $$INSERT INTO public.billing_settings (setting_key, value_days, description) VALUES ('unknown', 7, 'invalid')$$,
  '23514',
  NULL,
  'unsupported billing setting keys are rejected'
);

SELECT * FROM finish();

ROLLBACK;
