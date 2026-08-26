/*
 * Synchronize the Leadgaze OS pricing catalog with the approved pricing PRD.
 *
 * Single-module monthly prices per active module user:
 *   Launch $19, Growth $49, Scale $99
 *
 * Sales + Service monthly bundle prices per active bundled user:
 *   Launch $29, Growth $79, Scale $149
 *
 * Annual prices apply the PRD's recommended 20% discount:
 *   monthly price * 12 * 0.80
 *
 * This migration is additive and idempotent. It intentionally does not alter
 * historical invoice snapshots or existing migration files.
 */

BEGIN;

WITH desired_module_prices(
  module_key,
  plan_key,
  monthly_price,
  annual_price,
  billing_unit
) AS (
  VALUES
    ('sales', 'free_forever', 0.00::NUMERIC, 0.00::NUMERIC, 'free'),
    ('sales', 'launch', 19.00::NUMERIC, 182.40::NUMERIC, 'per_user_per_month'),
    ('sales', 'growth', 49.00::NUMERIC, 470.40::NUMERIC, 'per_user_per_month'),
    ('sales', 'scale', 99.00::NUMERIC, 950.40::NUMERIC, 'per_user_per_month'),
    ('service_cloud', 'free_forever', 0.00::NUMERIC, 0.00::NUMERIC, 'free'),
    ('service_cloud', 'launch', 19.00::NUMERIC, 182.40::NUMERIC, 'per_user_per_month'),
    ('service_cloud', 'growth', 49.00::NUMERIC, 470.40::NUMERIC, 'per_user_per_month'),
    ('service_cloud', 'scale', 99.00::NUMERIC, 950.40::NUMERIC, 'per_user_per_month')
)
INSERT INTO public.module_plan_prices (
  module_id,
  plan_id,
  monthly_price,
  annual_price,
  currency,
  billing_unit,
  is_active
)
SELECT product.id,
       plan_row.id,
       desired.monthly_price,
       desired.annual_price,
       'USD',
       desired.billing_unit,
       TRUE
FROM desired_module_prices desired
JOIN public.subscription_products product
  ON product.product_key = desired.module_key
JOIN public.plans plan_row
  ON plan_row.plan_key = desired.plan_key
ON CONFLICT (module_id, plan_id) DO UPDATE
SET monthly_price = EXCLUDED.monthly_price,
    annual_price = EXCLUDED.annual_price,
    currency = EXCLUDED.currency,
    billing_unit = EXCLUDED.billing_unit,
    is_active = TRUE,
    updated_at = NOW();

WITH desired_bundle_prices(
  bundle_key,
  bundle_name,
  description,
  plan_key,
  monthly_price,
  annual_price
) AS (
  VALUES
    (
      'sales_service_launch_bundle',
      'Sales + Service Launch',
      'Launch plan for Sales CRM and Service Cloud.',
      'launch',
      29.00::NUMERIC,
      278.40::NUMERIC
    ),
    (
      'sales_service_growth_bundle',
      'Sales + Service Growth',
      'Growth plan for Sales CRM and Service Cloud.',
      'growth',
      79.00::NUMERIC,
      758.40::NUMERIC
    ),
    (
      'sales_service_scale_bundle',
      'Sales + Service Scale',
      'Scale plan for Sales CRM and Service Cloud.',
      'scale',
      149.00::NUMERIC,
      1430.40::NUMERIC
    )
)
INSERT INTO public.bundles (
  bundle_key,
  bundle_name,
  description,
  plan_id,
  monthly_price,
  annual_price,
  currency,
  is_active
)
SELECT desired.bundle_key,
       desired.bundle_name,
       desired.description,
       plan_row.id,
       desired.monthly_price,
       desired.annual_price,
       'USD',
       TRUE
FROM desired_bundle_prices desired
JOIN public.plans plan_row
  ON plan_row.plan_key = desired.plan_key
ON CONFLICT (bundle_key) DO UPDATE
SET bundle_name = EXCLUDED.bundle_name,
    description = EXCLUDED.description,
    plan_id = EXCLUDED.plan_id,
    monthly_price = EXCLUDED.monthly_price,
    annual_price = EXCLUDED.annual_price,
    currency = EXCLUDED.currency,
    is_active = TRUE,
    updated_at = NOW();

DO $$
DECLARE
  configured_module_prices INTEGER;
  configured_bundle_prices INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO configured_module_prices
  FROM public.module_plan_prices price
  JOIN public.subscription_products product ON product.id = price.module_id
  JOIN public.plans plan_row ON plan_row.id = price.plan_id
  WHERE product.product_key IN ('sales', 'service_cloud')
    AND plan_row.plan_key IN ('free_forever', 'launch', 'growth', 'scale')
    AND price.monthly_price IS NOT NULL
    AND price.annual_price IS NOT NULL
    AND price.currency = 'USD'
    AND price.is_active;

  IF configured_module_prices <> 8 THEN
    RAISE EXCEPTION
      'Expected 8 active Sales/Service module prices, found %',
      configured_module_prices;
  END IF;

  SELECT COUNT(*)
  INTO configured_bundle_prices
  FROM public.bundles bundle
  WHERE bundle.bundle_key IN (
      'sales_service_launch_bundle',
      'sales_service_growth_bundle',
      'sales_service_scale_bundle'
    )
    AND bundle.monthly_price IS NOT NULL
    AND bundle.annual_price IS NOT NULL
    AND bundle.currency = 'USD'
    AND bundle.is_active;

  IF configured_bundle_prices <> 3 THEN
    RAISE EXCEPTION
      'Expected 3 active Sales + Service bundle prices, found %',
      configured_bundle_prices;
  END IF;
END;
$$;

COMMIT;
