BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;
SET LOCAL request.jwt.claim.role = 'service_role';

SELECT plan(5);

INSERT INTO public.accounts (id, name, email, created_at, updated_at)
VALUES (
  '71000000-0000-0000-0000-000000000001',
  'Entitlement Downgrade Owner',
  'entitlement-downgrade@leadgaze.invalid',
  NOW(),
  NOW()
);

INSERT INTO public.workspaces (id, name, slug, owner_id)
VALUES (
  '72000000-0000-0000-0000-000000000001',
  'Entitlement Downgrade Test',
  'entitlement-downgrade-test',
  '71000000-0000-0000-0000-000000000001'
);

INSERT INTO public.workspace_subscriptions (
  id,
  workspace_id,
  subscription_status,
  billing_cycle
)
VALUES (
  '73000000-0000-0000-0000-000000000001',
  '72000000-0000-0000-0000-000000000001',
  'active',
  'monthly'
);

INSERT INTO public.workspace_module_subscriptions (
  id,
  workspace_subscription_id,
  workspace_id,
  module_id,
  plan_id,
  status,
  started_at
)
SELECT '74000000-0000-0000-0000-000000000001',
       '73000000-0000-0000-0000-000000000001',
       '72000000-0000-0000-0000-000000000001',
       product.id,
       plan_row.id,
       'active',
       NOW()
FROM public.subscription_products product
CROSS JOIN public.plans plan_row
WHERE product.product_key = 'sales'
  AND plan_row.plan_key = 'growth';

SELECT is(
  (
    SELECT counter.limit_value
    FROM public.usage_counters counter
    JOIN public.feature_catalog feature ON feature.id = counter.feature_id
    WHERE counter.workspace_id = '72000000-0000-0000-0000-000000000001'
      AND feature.feature_key = 'sales.leads'
  ),
  5000,
  'new module subscriptions initialize numeric limits'
);

UPDATE public.usage_counters counter
SET current_usage = 300
FROM public.feature_catalog feature
WHERE counter.workspace_id = '72000000-0000-0000-0000-000000000001'
  AND counter.feature_id = feature.id
  AND feature.feature_key = 'sales.leads';

UPDATE public.workspace_module_subscriptions
SET plan_id = (SELECT id FROM public.plans WHERE plan_key = 'free_forever')
WHERE id = '74000000-0000-0000-0000-000000000001';

SELECT is(
  (
    SELECT counter.current_usage
    FROM public.usage_counters counter
    JOIN public.feature_catalog feature ON feature.id = counter.feature_id
    WHERE counter.workspace_id = '72000000-0000-0000-0000-000000000001'
      AND feature.feature_key = 'sales.leads'
  ),
  300,
  'downgrade preserves existing usage and records'
);

SELECT is(
  (
    SELECT counter.limit_value
    FROM public.usage_counters counter
    JOIN public.feature_catalog feature ON feature.id = counter.feature_id
    WHERE counter.workspace_id = '72000000-0000-0000-0000-000000000001'
      AND feature.feature_key = 'sales.leads'
  ),
  250,
  'downgrade immediately applies the lower numeric limit'
);

SELECT is(
  (
    public.try_consume_entitlement(
      '72000000-0000-0000-0000-000000000001',
      (SELECT id FROM public.feature_catalog WHERE feature_key = 'sales.leads'),
      1
    ) ->> 'allowed'
  )::BOOLEAN,
  FALSE,
  'creation remains blocked while existing usage exceeds the downgraded limit'
);

SELECT lives_ok(
  $$
    SELECT public.release_entitlement(
      '72000000-0000-0000-0000-000000000001',
      (SELECT id FROM public.feature_catalog WHERE feature_key = 'sales.leads'),
      51
    )
  $$,
  'deletions can reduce usage below the new plan limit'
);

SELECT * FROM finish();
ROLLBACK;

