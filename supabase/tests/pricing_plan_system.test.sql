BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;
SET LOCAL request.jwt.claim.role = 'service_role';

SELECT plan(27);

SELECT has_table('public', 'plans', 'plans table exists');
SELECT has_table('public', 'workspace_subscriptions', 'workspace subscriptions table exists');
SELECT has_table('public', 'usage_counters', 'usage counters table exists');
SELECT has_table('public', 'billing_provider_prices', 'provider price table exists');
SELECT has_table('public', 'workspace_billing_accounts', 'workspace billing accounts table exists');
SELECT has_table('public', 'workspace_billing_subscriptions', 'workspace billing subscriptions table exists');

SELECT is(
  (SELECT COUNT(*) FROM public.plans),
  4::BIGINT,
  'all four plans are seeded'
);

SELECT is(
  (SELECT COUNT(*) FROM public.feature_catalog),
  36::BIGINT,
  'the complete Sales and Service feature catalog is seeded'
);

SELECT is(
  (SELECT COUNT(*) FROM public.module_plan_prices),
  8::BIGINT,
  'each module has one price row for every plan'
);

SELECT is(
  (SELECT COUNT(*) FROM public.bundles),
  3::BIGINT,
  'Launch, Growth, and Scale bundles are seeded'
);

SELECT is(
  (
    SELECT parent.plan_key
    FROM public.plans child
    JOIN public.plans parent ON parent.id = child.parent_plan_id
    WHERE child.plan_key = 'scale'
  ),
  'growth'::VARCHAR,
  'Scale inherits from Growth'
);

SELECT throws_ok(
  $$
    UPDATE public.plans
    SET parent_plan_id = (SELECT id FROM public.plans WHERE plan_key = 'scale')
    WHERE plan_key = 'free_forever'
  $$,
  '23514',
  'Plan inheritance cannot contain a cycle',
  'plan inheritance cycles are rejected'
);

SELECT is(
  (
    SELECT entitlement.limit_value
    FROM public.get_effective_plan_entitlement(
      (SELECT id FROM public.plans WHERE plan_key = 'growth'),
      (SELECT id FROM public.feature_catalog WHERE feature_key = 'sales.leads')
    ) entitlement
  ),
  5000,
  'Growth resolves its Sales lead override'
);

SELECT is(
  (
    SELECT entitlement.resolved_from_plan_key
    FROM public.get_effective_plan_entitlement(
      (SELECT id FROM public.plans WHERE plan_key = 'launch'),
      (SELECT id FROM public.feature_catalog WHERE feature_key = 'sales.meta_ads')
    ) entitlement
  ),
  'free_forever'::VARCHAR,
  'Launch falls back to the Free Forever Meta Ads entitlement'
);

SELECT is(
  (
    SELECT entitlement.resolved_from_plan_key
    FROM public.get_effective_plan_entitlement(
      (SELECT id FROM public.plans WHERE plan_key = 'scale'),
      (SELECT id FROM public.feature_catalog WHERE feature_key = 'sales.advanced_reports')
    ) entitlement
  ),
  'growth'::VARCHAR,
  'Scale inherits Advanced Reports from Growth'
);

SELECT is(
  (
    SELECT COUNT(*)
    FROM public.crm_module_features feature
    JOIN public.crm_modules module ON module.id = feature.module_id
    WHERE module.module_key = 'subscription'
      AND feature.feature_key IN ('view', 'manage', 'billing')
  ),
  3::BIGINT,
  'all subscription RBAC features are seeded'
);

INSERT INTO public.accounts (id, name, email, created_at, updated_at)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  'Pricing Test Owner',
  'pricing-foundation-test@leadgaze.invalid',
  NOW(),
  NOW()
);

INSERT INTO public.workspaces (id, name, slug, owner_id)
VALUES (
  '20000000-0000-0000-0000-000000000001',
  'Pricing Foundation Test',
  'pricing-foundation-test',
  '10000000-0000-0000-0000-000000000001'
);

INSERT INTO public.workspace_subscriptions (
  id,
  workspace_id,
  subscription_status,
  billing_cycle
)
VALUES (
  '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
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
SELECT '40000000-0000-0000-0000-000000000001',
       '30000000-0000-0000-0000-000000000001',
       '20000000-0000-0000-0000-000000000001',
       product.id,
       plan_row.id,
       'active',
       NOW()
FROM public.subscription_products product
CROSS JOIN public.plans plan_row
WHERE product.product_key = 'sales'
  AND plan_row.plan_key = 'growth';

INSERT INTO public.usage_counters (
  workspace_id,
  module_id,
  feature_id,
  current_usage,
  limit_value
)
SELECT '20000000-0000-0000-0000-000000000001',
       product.id,
       feature.id,
       0,
       2
FROM public.subscription_products product
JOIN public.feature_catalog feature ON feature.module_id = product.id
WHERE product.product_key = 'sales'
  AND feature.feature_key = 'sales.leads';

SELECT is(
  public.get_workspace_entitlement_context(
    '20000000-0000-0000-0000-000000000001',
    'sales'
  ) #>> '{plan,plan_key}',
  'growth',
  'workspace context resolves the active module plan'
);

SELECT is(
  (
    public.get_workspace_entitlement_context(
      '20000000-0000-0000-0000-000000000001',
      'sales'
    ) #>> '{features,sales.leads,current_usage}'
  )::INTEGER,
  0,
  'workspace context includes current feature usage'
);

SELECT is(
  (
    public.try_consume_entitlement(
      '20000000-0000-0000-0000-000000000001',
      (SELECT id FROM public.feature_catalog WHERE feature_key = 'sales.leads'),
      1
    )->>'allowed'
  )::BOOLEAN,
  TRUE,
  'the first unit is consumed'
);

SELECT is(
  (
    public.try_consume_entitlement(
      '20000000-0000-0000-0000-000000000001',
      (SELECT id FROM public.feature_catalog WHERE feature_key = 'sales.leads'),
      1
    )->>'current_usage'
  )::INTEGER,
  2,
  'consumption reaches the exact limit'
);

SELECT is(
  (
    public.try_consume_entitlement(
      '20000000-0000-0000-0000-000000000001',
      (SELECT id FROM public.feature_catalog WHERE feature_key = 'sales.leads'),
      1
    )->>'allowed'
  )::BOOLEAN,
  FALSE,
  'consumption over the limit is rejected'
);

SELECT is(
  (
    SELECT current_usage
    FROM public.usage_counters counter
    JOIN public.feature_catalog feature ON feature.id = counter.feature_id
    WHERE counter.workspace_id = '20000000-0000-0000-0000-000000000001'
      AND feature.feature_key = 'sales.leads'
  ),
  2,
  'a rejected consumption does not change the counter'
);

SELECT lives_ok(
  $$
    SELECT public.release_entitlement(
      '20000000-0000-0000-0000-000000000001',
      (SELECT id FROM public.feature_catalog WHERE feature_key = 'sales.leads'),
      1
    )
  $$,
  'usage can be released'
);

SELECT is(
  (
    SELECT current_usage
    FROM public.usage_counters counter
    JOIN public.feature_catalog feature ON feature.id = counter.feature_id
    WHERE counter.workspace_id = '20000000-0000-0000-0000-000000000001'
      AND feature.feature_key = 'sales.leads'
  ),
  1,
  'release decrements current usage'
);

SELECT lives_ok(
  $$
    SELECT public.release_entitlement(
      '20000000-0000-0000-0000-000000000001',
      (SELECT id FROM public.feature_catalog WHERE feature_key = 'sales.leads'),
      50
    )
  $$,
  'releasing more than current usage is safe'
);

SELECT is(
  (
    SELECT current_usage
    FROM public.usage_counters counter
    JOIN public.feature_catalog feature ON feature.id = counter.feature_id
    WHERE counter.workspace_id = '20000000-0000-0000-0000-000000000001'
      AND feature.feature_key = 'sales.leads'
  ),
  0,
  'release never lowers usage below zero'
);

SELECT is(
  (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'billing_provider_prices'
      AND column_name IN ('provider_customer_id', 'provider_subscription_id')
  ),
  0::BIGINT,
  'provider-price rows do not contain workspace billing identifiers'
);

SELECT * FROM finish();

ROLLBACK;
