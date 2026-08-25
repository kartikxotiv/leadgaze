BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;
SET LOCAL request.jwt.claim.role = 'service_role';

SELECT plan(8);

SELECT is(
  (
    SELECT COUNT(*)
    FROM public.module_plan_prices price
    JOIN public.plans plan_row ON plan_row.id = price.plan_id
    JOIN public.subscription_products product ON product.id = price.module_id
    WHERE product.product_key IN ('sales', 'service_cloud')
      AND plan_row.plan_key = 'launch'
      AND price.monthly_price = 19.00
      AND price.annual_price = 182.40
      AND price.currency = 'USD'
      AND price.is_active
  ),
  2::BIGINT,
  'Launch costs $19 monthly or $182.40 annually for each module'
);

SELECT is(
  (
    SELECT COUNT(*)
    FROM public.module_plan_prices price
    JOIN public.plans plan_row ON plan_row.id = price.plan_id
    JOIN public.subscription_products product ON product.id = price.module_id
    WHERE product.product_key IN ('sales', 'service_cloud')
      AND plan_row.plan_key = 'growth'
      AND price.monthly_price = 49.00
      AND price.annual_price = 470.40
      AND price.currency = 'USD'
      AND price.is_active
  ),
  2::BIGINT,
  'Growth costs $49 monthly or $470.40 annually for each module'
);

SELECT is(
  (
    SELECT COUNT(*)
    FROM public.module_plan_prices price
    JOIN public.plans plan_row ON plan_row.id = price.plan_id
    JOIN public.subscription_products product ON product.id = price.module_id
    WHERE product.product_key IN ('sales', 'service_cloud')
      AND plan_row.plan_key = 'scale'
      AND price.monthly_price = 99.00
      AND price.annual_price = 950.40
      AND price.currency = 'USD'
      AND price.is_active
  ),
  2::BIGINT,
  'Scale costs $99 monthly or $950.40 annually for each module'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM public.bundles
    WHERE bundle_key = 'sales_service_launch_bundle'
      AND monthly_price = 29.00
      AND annual_price = 278.40
      AND currency = 'USD'
      AND is_active
  ),
  'the Launch bundle follows the PRD price and annual discount'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM public.bundles
    WHERE bundle_key = 'sales_service_growth_bundle'
      AND monthly_price = 79.00
      AND annual_price = 758.40
      AND currency = 'USD'
      AND is_active
  ),
  'the Growth bundle follows the PRD price and annual discount'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM public.bundles
    WHERE bundle_key = 'sales_service_scale_bundle'
      AND monthly_price = 149.00
      AND annual_price = 1430.40
      AND currency = 'USD'
      AND is_active
  ),
  'the Scale bundle follows the PRD price and annual discount'
);

SELECT is(
  (
    SELECT COUNT(*)
    FROM public.module_plan_prices price
    JOIN public.plans plan_row ON plan_row.id = price.plan_id
    JOIN public.subscription_products product ON product.id = price.module_id
    WHERE product.product_key IN ('sales', 'service_cloud')
      AND plan_row.plan_key IN ('launch', 'growth', 'scale')
      AND price.annual_price = ROUND(price.monthly_price * 12 * 0.80, 2)
  ),
  6::BIGINT,
  'every paid module price applies the 20 percent annual discount'
);

SELECT is(
  (
    SELECT COUNT(*)
    FROM public.bundles
    WHERE bundle_key IN (
        'sales_service_launch_bundle',
        'sales_service_growth_bundle',
        'sales_service_scale_bundle'
      )
      AND annual_price = ROUND(monthly_price * 12 * 0.80, 2)
  ),
  3::BIGINT,
  'every bundle price applies the 20 percent annual discount'
);

SELECT * FROM finish();

ROLLBACK;
