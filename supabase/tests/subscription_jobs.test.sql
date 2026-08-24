BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;
SET LOCAL request.jwt.claim.role = 'service_role';

SELECT plan(12);

SELECT has_table('public', 'billing_events', 'billing event ledger exists');
SELECT has_table(
  'public',
  'subscription_notifications',
  'subscription notification ledger exists'
);
SELECT has_function(
  'public',
  'expire_due_subscription_trials',
  ARRAY[]::TEXT[],
  'trial expiry processor exists'
);
SELECT has_function(
  'public',
  'reconcile_subscription_usage',
  ARRAY[]::TEXT[],
  'usage reconciliation processor exists'
);

INSERT INTO public.accounts (id, name, email, created_at, updated_at)
VALUES (
  '91000000-0000-0000-0000-000000000001',
  'Subscription Jobs Owner',
  'subscription-jobs@leadgaze.invalid',
  NOW(),
  NOW()
);

INSERT INTO public.workspaces (id, name, slug, owner_id)
VALUES (
  '92000000-0000-0000-0000-000000000001',
  'Subscription Jobs Test',
  'subscription-jobs-test',
  '91000000-0000-0000-0000-000000000001'
);

INSERT INTO public.workspace_subscriptions (
  id,
  workspace_id,
  subscription_status,
  billing_cycle,
  trial_start_date,
  trial_end_date
)
VALUES (
  '93000000-0000-0000-0000-000000000001',
  '92000000-0000-0000-0000-000000000001',
  'trial_active',
  'monthly',
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '1 day'
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
SELECT '94000000-0000-0000-0000-000000000001',
       '93000000-0000-0000-0000-000000000001',
       '92000000-0000-0000-0000-000000000001',
       product.id,
       plan_row.id,
       'trial',
       NOW() - INTERVAL '15 days'
FROM public.subscription_products product
CROSS JOIN public.plans plan_row
WHERE product.product_key = 'sales'
  AND plan_row.plan_key = 'growth';

UPDATE public.usage_counters counter
SET current_usage = 17
FROM public.feature_catalog feature
WHERE counter.workspace_id = '92000000-0000-0000-0000-000000000001'
  AND counter.feature_id = feature.id
  AND feature.feature_key = 'sales.leads';

SELECT results_eq(
  $$SELECT workspace_id FROM public.expire_due_subscription_trials()$$,
  $$VALUES ('92000000-0000-0000-0000-000000000001'::UUID)$$,
  'the due trial is processed once'
);

SELECT is(
  (
    SELECT subscription_status
    FROM public.workspace_subscriptions
    WHERE workspace_id = '92000000-0000-0000-0000-000000000001'
  ),
  'free'::VARCHAR,
  'expired trials fall back to an enforceable Free Forever state'
);

SELECT is(
  (
    SELECT plan_row.plan_key
    FROM public.workspace_module_subscriptions module_subscription
    JOIN public.plans plan_row ON plan_row.id = module_subscription.plan_id
    WHERE module_subscription.id = '94000000-0000-0000-0000-000000000001'
  ),
  'free_forever'::VARCHAR,
  'trial modules move to Free Forever'
);

SELECT is(
  (
    SELECT counter.limit_value
    FROM public.usage_counters counter
    JOIN public.feature_catalog feature ON feature.id = counter.feature_id
    WHERE counter.workspace_id = '92000000-0000-0000-0000-000000000001'
      AND feature.feature_key = 'sales.leads'
  ),
  250,
  'trial expiry updates counters to the Free Forever limit'
);

SELECT is(
  (
    SELECT COUNT(*)
    FROM public.billing_events
    WHERE workspace_id = '92000000-0000-0000-0000-000000000001'
      AND event_type = 'trial_expired'
  ),
  1::BIGINT,
  'trial expiry is recorded idempotently in the billing ledger'
);

SELECT is(
  (SELECT COUNT(*) FROM public.expire_due_subscription_trials()),
  0::BIGINT,
  'retrying the trial-expiry cron does not process the workspace twice'
);

SELECT lives_ok(
  $$SELECT public.reconcile_subscription_usage()$$,
  'usage reconciliation completes successfully'
);

SELECT is(
  (
    SELECT counter.current_usage
    FROM public.usage_counters counter
    JOIN public.feature_catalog feature ON feature.id = counter.feature_id
    WHERE counter.workspace_id = '92000000-0000-0000-0000-000000000001'
      AND feature.feature_key = 'sales.leads'
  ),
  0,
  'usage reconciliation repairs a drifted counter from business records'
);

SELECT * FROM finish();
ROLLBACK;
