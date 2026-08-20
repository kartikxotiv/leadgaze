BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, core, service_cloud, extensions;
SET LOCAL request.jwt.claim.role = 'service_role';

SELECT plan(16);

SELECT has_function(
  'public',
  'get_legacy_paid_launch_targets',
  ARRAY[]::TEXT[],
  'legacy paid Launch target preview exists'
);

SELECT has_function(
  'public',
  'migrate_legacy_paid_seats_to_launch',
  ARRAY[]::TEXT[],
  'legacy paid Launch migration exists'
);

INSERT INTO public.accounts (id, name, email, created_at, updated_at)
VALUES
  ('c1000000-0000-4000-8000-000000000001', 'Paid Launch Owner', 'paid-launch-owner@leadgaze.invalid', NOW(), NOW()),
  ('c1000000-0000-4000-8000-000000000002', 'Paid Launch User', 'paid-launch-user@leadgaze.invalid', NOW(), NOW()),
  ('c1000000-0000-4000-8000-000000000003', 'Explicit Growth Owner', 'explicit-growth-owner@leadgaze.invalid', NOW(), NOW());

INSERT INTO public.workspaces (id, name, slug, owner_id)
VALUES
  ('c2000000-0000-4000-8000-000000000001', 'Paid Launch Workspace', 'paid-launch-migration-test', 'c1000000-0000-4000-8000-000000000001'),
  ('c2000000-0000-4000-8000-000000000002', 'Explicit Growth Workspace', 'explicit-growth-paid-test', 'c1000000-0000-4000-8000-000000000003');

INSERT INTO public.workspace_module_seats (
  id,
  workspace_id,
  product_id,
  seats_purchased,
  status,
  billing_cycle,
  current_period_start,
  current_period_end,
  payment_provider,
  created_by
)
SELECT CASE product.product_key
         WHEN 'sales' THEN 'c3000000-0000-4000-8000-000000000001'::UUID
         ELSE 'c3000000-0000-4000-8000-000000000002'::UUID
       END,
       'c2000000-0000-4000-8000-000000000001',
       product.id,
       CASE product.product_key WHEN 'sales' THEN 3 ELSE 2 END,
       'active',
       'monthly',
       NOW(),
       NOW() + INTERVAL '1 month',
       'stripe',
       'c1000000-0000-4000-8000-000000000001'
FROM public.subscription_products product
WHERE product.product_key IN ('sales', 'service_cloud');

INSERT INTO public.seat_assignments (
  seat_id,
  workspace_id,
  user_id,
  product_id,
  is_active,
  assigned_by
)
SELECT seat.id,
       seat.workspace_id,
       CASE product.product_key
         WHEN 'sales' THEN 'c1000000-0000-4000-8000-000000000001'::UUID
         ELSE 'c1000000-0000-4000-8000-000000000002'::UUID
       END,
       seat.product_id,
       TRUE,
       'c1000000-0000-4000-8000-000000000001'
FROM public.workspace_module_seats seat
JOIN public.subscription_products product ON product.id = seat.product_id
WHERE seat.workspace_id = 'c2000000-0000-4000-8000-000000000001';

INSERT INTO public.workspace_subscriptions (
  workspace_id,
  subscription_status,
  billing_cycle
)
VALUES (
  'c2000000-0000-4000-8000-000000000002',
  'active',
  'monthly'
);

INSERT INTO public.workspace_module_subscriptions (
  workspace_subscription_id,
  workspace_id,
  module_id,
  plan_id,
  status,
  started_at
)
SELECT workspace_subscription.id,
       workspace_subscription.workspace_id,
       product.id,
       plan_row.id,
       'active',
       NOW()
FROM public.workspace_subscriptions workspace_subscription
CROSS JOIN public.subscription_products product
CROSS JOIN public.plans plan_row
WHERE workspace_subscription.workspace_id = 'c2000000-0000-4000-8000-000000000002'
  AND product.product_key = 'sales'
  AND plan_row.plan_key = 'growth';

INSERT INTO public.workspace_module_seats (
  workspace_id,
  product_id,
  seats_purchased,
  status,
  billing_cycle,
  payment_provider,
  created_by
)
SELECT 'c2000000-0000-4000-8000-000000000002',
       product.id,
       4,
       'active',
       'monthly',
       'stripe',
       'c1000000-0000-4000-8000-000000000003'
FROM public.subscription_products product
WHERE product.product_key = 'sales';

SELECT is(
  (
    SELECT COUNT(*)
    FROM public.get_legacy_paid_launch_targets()
    WHERE workspace_id = 'c2000000-0000-4000-8000-000000000001'
  ),
  2::BIGINT,
  'both legacy paid modules require Launch'
);

SELECT is(
  (
    SELECT paid_seats
    FROM public.get_legacy_paid_launch_targets()
    WHERE workspace_id = 'c2000000-0000-4000-8000-000000000001'
      AND module_key = 'sales'
  ),
  3,
  'Sales purchased seat capacity is detected exactly'
);

SELECT is(
  (
    SELECT COUNT(*)
    FROM public.get_legacy_paid_launch_targets()
    WHERE workspace_id = 'c2000000-0000-4000-8000-000000000002'
  ),
  0::BIGINT,
  'an explicit Growth plan is excluded from Launch migration'
);

SELECT is(
  (
    public.migrate_legacy_paid_seats_to_launch()->>'target_module_count'
  )::INTEGER,
  2,
  'migration processes both paid modules'
);

SELECT is(
  (
    SELECT subscription_status
    FROM public.workspace_subscriptions
    WHERE workspace_id = 'c2000000-0000-4000-8000-000000000001'
  ),
  'active'::VARCHAR,
  'paid workspace receives an active workspace subscription'
);

SELECT is(
  (
    SELECT COUNT(*)
    FROM public.workspace_module_subscriptions module_subscription
    JOIN public.plans plan_row ON plan_row.id = module_subscription.plan_id
    WHERE module_subscription.workspace_id = 'c2000000-0000-4000-8000-000000000001'
      AND plan_row.plan_key = 'launch'
      AND module_subscription.status = 'active'
  ),
  2::BIGINT,
  'Sales and Service Cloud receive active Launch plans'
);

SELECT is(
  (
    SELECT COUNT(*)
    FROM public.workspace_module_users
    WHERE workspace_id = 'c2000000-0000-4000-8000-000000000001'
      AND status = 'active'
  ),
  2::BIGINT,
  'actual active seat assignments become module users'
);

SELECT is(
  (
    SELECT SUM(seats_purchased)::INTEGER
    FROM public.workspace_module_seats
    WHERE workspace_id = 'c2000000-0000-4000-8000-000000000001'
  ),
  5,
  'all purchased seat capacity remains unchanged'
);

SELECT is(
  (
    SELECT plan_row.plan_key
    FROM public.workspace_module_subscriptions module_subscription
    JOIN public.plans plan_row ON plan_row.id = module_subscription.plan_id
    JOIN public.subscription_products product ON product.id = module_subscription.module_id
    WHERE module_subscription.workspace_id = 'c2000000-0000-4000-8000-000000000002'
      AND product.product_key = 'sales'
  ),
  'growth'::VARCHAR,
  'migration never downgrades an explicit Growth plan'
);

SELECT is(
  (
    SELECT COUNT(*)
    FROM public.get_legacy_paid_launch_targets()
    WHERE workspace_id = 'c2000000-0000-4000-8000-000000000001'
  ),
  0::BIGINT,
  'no targets remain after successful migration'
);

SELECT is(
  (
    public.migrate_legacy_paid_seats_to_launch()->>'target_module_count'
  )::INTEGER,
  0,
  'rerunning the migration function is idempotent'
);

SELECT is(
  (
    SELECT COUNT(*)
    FROM public.workspace_module_subscriptions
    WHERE workspace_id = 'c2000000-0000-4000-8000-000000000001'
  ),
  2::BIGINT,
  'idempotent rerun does not duplicate module subscriptions'
);

SELECT is(
  (
    SELECT COUNT(*)
    FROM public.workspace_module_users
    WHERE workspace_id = 'c2000000-0000-4000-8000-000000000001'
  ),
  2::BIGINT,
  'idempotent rerun does not duplicate module users'
);

SELECT ok(
  (
    SELECT COUNT(*)
    FROM public.usage_counters
    WHERE workspace_id = 'c2000000-0000-4000-8000-000000000001'
  ) > 0,
  'Launch usage counters are initialized'
);

SELECT * FROM finish();

ROLLBACK;
