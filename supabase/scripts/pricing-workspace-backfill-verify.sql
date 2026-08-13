\set ON_ERROR_STOP on
\pset pager off

\echo 'Backfill audit record'
SELECT operation_key,
       status,
       started_at,
       completed_at,
       jsonb_pretty(summary) AS summary
FROM public.pricing_backfill_runs
WHERE operation_key = 'pricing_workspace_backfill_v1';

\echo 'Validation issues (zero error rows required)'
SELECT * FROM public.validate_pricing_workspace_backfill();

\echo 'Coverage summary'
SELECT
  (SELECT COUNT(*) FROM public.workspaces) AS workspaces,
  (SELECT COUNT(*) FROM public.workspace_subscriptions) AS workspace_subscriptions,
  (
    SELECT COUNT(*)
    FROM public.workspace_module_subscriptions module_subscription
    JOIN public.subscription_products product ON product.id = module_subscription.module_id
    WHERE product.product_key IN ('sales', 'service_cloud')
  ) AS supported_module_subscriptions,
  (
    SELECT COUNT(*)
    FROM public.workspace_module_users
    WHERE status = 'active'
  ) AS active_module_users,
  (SELECT COUNT(*) FROM public.usage_counters) AS usage_counters;

DO $$
DECLARE
  workspace_count INTEGER;
  workspace_subscription_count INTEGER;
  supported_module_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO workspace_count FROM public.workspaces;
  SELECT COUNT(*) INTO workspace_subscription_count
  FROM public.workspace_subscriptions;
  SELECT COUNT(*) INTO supported_module_count
  FROM public.workspace_module_subscriptions module_subscription
  JOIN public.subscription_products product ON product.id = module_subscription.module_id
  WHERE product.product_key IN ('sales', 'service_cloud');

  IF workspace_subscription_count <> workspace_count THEN
    RAISE EXCEPTION 'Not every workspace has an explicit workspace subscription';
  END IF;

  IF supported_module_count <> workspace_count * 2 THEN
    RAISE EXCEPTION 'Not every workspace has explicit Sales and Service plans';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.validate_pricing_workspace_backfill()
    WHERE severity = 'error'
  ) THEN
    RAISE EXCEPTION 'Pricing workspace backfill validation failed';
  END IF;
END
$$;

\echo 'Verification passed.'

