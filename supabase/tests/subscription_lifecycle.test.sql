BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;
SET LOCAL request.jwt.claim.role = 'service_role';

SELECT plan(8);

SELECT has_function(
  'public',
  'apply_due_subscription_changes',
  ARRAY['uuid'],
  'scheduled subscription change processor exists'
);

INSERT INTO public.accounts (id, name, email, created_at, updated_at)
VALUES (
  '81000000-0000-0000-0000-000000000001',
  'Subscription Lifecycle Owner',
  'subscription-lifecycle@leadgaze.invalid',
  NOW(),
  NOW()
);

INSERT INTO public.workspaces (id, name, slug, owner_id)
VALUES (
  '82000000-0000-0000-0000-000000000001',
  'Subscription Lifecycle Test',
  'subscription-lifecycle-test',
  '81000000-0000-0000-0000-000000000001'
);

INSERT INTO public.workspace_subscriptions (
  id,
  workspace_id,
  subscription_status,
  billing_cycle,
  current_period_start,
  current_period_end
)
VALUES (
  '83000000-0000-0000-0000-000000000001',
  '82000000-0000-0000-0000-000000000001',
  'active',
  'monthly',
  NOW() - INTERVAL '1 month',
  NOW() + INTERVAL '1 month'
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
SELECT CASE product.product_key
         WHEN 'sales' THEN '84000000-0000-0000-0000-000000000001'::UUID
         ELSE '84000000-0000-0000-0000-000000000002'::UUID
       END,
       '83000000-0000-0000-0000-000000000001',
       '82000000-0000-0000-0000-000000000001',
       product.id,
       plan_row.id,
       'active',
       NOW() - INTERVAL '1 month'
FROM public.subscription_products product
CROSS JOIN public.plans plan_row
WHERE product.product_key IN ('sales', 'service_cloud')
  AND plan_row.plan_key = 'growth';

INSERT INTO public.workspace_module_users (
  workspace_id,
  user_id,
  module_id,
  status,
  assigned_by
)
SELECT '82000000-0000-0000-0000-000000000001',
       '81000000-0000-0000-0000-000000000001',
       id,
       'active',
       '81000000-0000-0000-0000-000000000001'
FROM public.subscription_products
WHERE product_key = 'service_cloud';

INSERT INTO public.subscription_changes (
  workspace_module_subscription_id,
  workspace_id,
  change_type,
  from_plan_id,
  to_plan_id,
  effective_at,
  status,
  created_by
)
VALUES
  (
    '84000000-0000-0000-0000-000000000001',
    '82000000-0000-0000-0000-000000000001',
    'plan_downgrade',
    (SELECT id FROM public.plans WHERE plan_key = 'growth'),
    (SELECT id FROM public.plans WHERE plan_key = 'launch'),
    NOW() - INTERVAL '1 minute',
    'pending',
    '81000000-0000-0000-0000-000000000001'
  ),
  (
    '84000000-0000-0000-0000-000000000002',
    '82000000-0000-0000-0000-000000000001',
    'module_cancel',
    (SELECT id FROM public.plans WHERE plan_key = 'growth'),
    NULL,
    NOW() - INTERVAL '1 minute',
    'pending',
    '81000000-0000-0000-0000-000000000001'
  ),
  (
    '84000000-0000-0000-0000-000000000001',
    '82000000-0000-0000-0000-000000000001',
    'plan_downgrade',
    (SELECT id FROM public.plans WHERE plan_key = 'launch'),
    (SELECT id FROM public.plans WHERE plan_key = 'free_forever'),
    NOW() + INTERVAL '2 months',
    'pending',
    '81000000-0000-0000-0000-000000000001'
  );

SELECT is(
  public.apply_due_subscription_changes(
    '82000000-0000-0000-0000-000000000001'
  ),
  2,
  'only due changes are applied'
);

SELECT is(
  (
    SELECT plan_row.plan_key
    FROM public.workspace_module_subscriptions module_subscription
    JOIN public.plans plan_row ON plan_row.id = module_subscription.plan_id
    WHERE module_subscription.id = '84000000-0000-0000-0000-000000000001'
  ),
  'launch'::VARCHAR,
  'due downgrade changes the module plan'
);

SELECT is(
  (
    SELECT status
    FROM public.workspace_module_subscriptions
    WHERE id = '84000000-0000-0000-0000-000000000002'
  ),
  'cancelled'::VARCHAR,
  'due module removal cancels the module'
);

SELECT is(
  (
    SELECT status
    FROM public.workspace_module_users
    WHERE workspace_id = '82000000-0000-0000-0000-000000000001'
      AND module_id = (
        SELECT id FROM public.subscription_products WHERE product_key = 'service_cloud'
      )
  ),
  'removed'::VARCHAR,
  'module removal also removes module-user assignments'
);

SELECT is(
  (
    SELECT COUNT(*)
    FROM public.subscription_changes
    WHERE workspace_id = '82000000-0000-0000-0000-000000000001'
      AND status = 'applied'
  ),
  2::BIGINT,
  'applied changes are recorded explicitly'
);

SELECT is(
  (
    SELECT COUNT(*)
    FROM public.subscription_changes
    WHERE workspace_id = '82000000-0000-0000-0000-000000000001'
      AND status = 'pending'
  ),
  1::BIGINT,
  'future changes remain pending'
);

SELECT is(
  public.apply_due_subscription_changes(
    '82000000-0000-0000-0000-000000000001'
  ),
  0,
  'retrying the lifecycle processor does not reapply completed changes'
);

SELECT * FROM finish();
ROLLBACK;
