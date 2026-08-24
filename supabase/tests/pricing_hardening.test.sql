BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, core, service_cloud, extensions;
SET LOCAL request.jwt.claim.role = 'service_role';

SELECT plan(16);

SELECT is(
  has_function_privilege(
    'authenticated',
    'public.try_consume_entitlement(uuid,uuid,integer)',
    'EXECUTE'
  ),
  FALSE,
  'authenticated clients cannot reserve entitlement counters directly'
);

SELECT is(
  has_function_privilege(
    'authenticated',
    'public.release_entitlement(uuid,uuid,integer)',
    'EXECUTE'
  ),
  FALSE,
  'authenticated clients cannot release entitlement counters directly'
);

SELECT is(
  has_table_privilege('authenticated', 'public.usage_events', 'INSERT'),
  FALSE,
  'authenticated clients cannot insert usage events directly'
);

SELECT is(
  has_table_privilege(
    'authenticated',
    'public.workspace_module_users',
    'INSERT'
  ),
  FALSE,
  'authenticated clients cannot bypass the module-user API'
);

SELECT is(
  has_table_privilege(
    'authenticated',
    'public.subscription_notifications',
    'UPDATE'
  ),
  FALSE,
  'authenticated clients do not have full notification update access'
);

SELECT is(
  has_column_privilege(
    'authenticated',
    'public.subscription_notifications',
    'read_at',
    'UPDATE'
  ),
  TRUE,
  'authenticated recipients may update only notification read state'
);

INSERT INTO public.accounts (id, name, email, created_at, updated_at)
VALUES
  (
    'c1000000-0000-4000-8000-000000000001',
    'Lifecycle Hardening Owner',
    'lifecycle-hardening@leadgaze.invalid',
    NOW(),
    NOW()
  ),
  (
    'c1000000-0000-4000-8000-000000000002',
    'Trial Amount Owner',
    'trial-amount@leadgaze.invalid',
    NOW(),
    NOW()
  );

INSERT INTO public.workspaces (id, name, slug, owner_id)
VALUES
  (
    'c2000000-0000-4000-8000-000000000001',
    'Lifecycle Hardening Workspace',
    'lifecycle-hardening-workspace',
    'c1000000-0000-4000-8000-000000000001'
  ),
  (
    'c2000000-0000-4000-8000-000000000002',
    'Trial Amount Workspace',
    'trial-amount-workspace',
    'c1000000-0000-4000-8000-000000000002'
  );

INSERT INTO public.workspace_subscriptions (
  id,
  workspace_id,
  subscription_status,
  billing_cycle,
  trial_start_date,
  trial_end_date
)
VALUES
  (
    'c3000000-0000-4000-8000-000000000001',
    'c2000000-0000-4000-8000-000000000001',
    'active',
    'monthly',
    NULL,
    NULL
  ),
  (
    'c3000000-0000-4000-8000-000000000002',
    'c2000000-0000-4000-8000-000000000002',
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
  monthly_amount,
  annual_amount,
  started_at
)
SELECT CASE
         WHEN product.product_key = 'sales'
           THEN 'c4000000-0000-4000-8000-000000000001'::UUID
         ELSE 'c4000000-0000-4000-8000-000000000002'::UUID
       END,
       'c3000000-0000-4000-8000-000000000001',
       'c2000000-0000-4000-8000-000000000001',
       product.id,
       plan_row.id,
       'active',
       49,
       470.40,
       NOW()
FROM public.subscription_products product
CROSS JOIN public.plans plan_row
WHERE product.product_key IN ('sales', 'service_cloud')
  AND plan_row.plan_key = 'growth';

INSERT INTO public.workspace_module_subscriptions (
  id,
  workspace_subscription_id,
  workspace_id,
  module_id,
  plan_id,
  status,
  monthly_amount,
  annual_amount,
  started_at
)
SELECT 'c4000000-0000-4000-8000-000000000003',
       'c3000000-0000-4000-8000-000000000002',
       'c2000000-0000-4000-8000-000000000002',
       product.id,
       plan_row.id,
       'trial',
       49,
       470.40,
       NOW() - INTERVAL '15 days'
FROM public.subscription_products product
CROSS JOIN public.plans plan_row
WHERE product.product_key = 'sales'
  AND plan_row.plan_key = 'growth';

INSERT INTO public.subscription_changes (
  id,
  workspace_module_subscription_id,
  workspace_id,
  change_type,
  from_plan_id,
  to_plan_id,
  effective_at,
  status,
  created_by
)
VALUES (
  'c5000000-0000-4000-8000-000000000001',
  'c4000000-0000-4000-8000-000000000001',
  'c2000000-0000-4000-8000-000000000001',
  'plan_downgrade',
  (SELECT id FROM public.plans WHERE plan_key = 'growth'),
  (SELECT id FROM public.plans WHERE plan_key = 'launch'),
  NOW() - INTERVAL '1 minute',
  'pending',
  'c1000000-0000-4000-8000-000000000001'
);

UPDATE public.module_plan_prices
SET is_active = FALSE
WHERE module_id = (
    SELECT id FROM public.subscription_products WHERE product_key = 'sales'
  )
  AND plan_id = (SELECT id FROM public.plans WHERE plan_key = 'launch');

SELECT throws_ok(
  $$
    SELECT public.apply_due_subscription_changes(
      'c2000000-0000-4000-8000-000000000001'
    )
  $$,
  '23514',
  'Pending downgrade c5000000-0000-4000-8000-000000000001 did not update exactly one active module',
  'a downgrade is not marked applied when its catalog price is unavailable'
);

SELECT is(
  (
    SELECT status
    FROM public.subscription_changes
    WHERE id = 'c5000000-0000-4000-8000-000000000001'
  ),
  'pending'::VARCHAR,
  'a failed lifecycle application remains pending for retry'
);

UPDATE public.module_plan_prices
SET is_active = TRUE
WHERE module_id = (
    SELECT id FROM public.subscription_products WHERE product_key = 'sales'
  )
  AND plan_id = (SELECT id FROM public.plans WHERE plan_key = 'launch');

SELECT is(
  public.apply_due_subscription_changes(
    'c2000000-0000-4000-8000-000000000001'
  ),
  1,
  'a valid pending downgrade applies exactly once'
);

SELECT is(
  (
    SELECT plan_row.plan_key
    FROM public.workspace_module_subscriptions module_subscription
    JOIN public.plans plan_row ON plan_row.id = module_subscription.plan_id
    WHERE module_subscription.id = 'c4000000-0000-4000-8000-000000000001'
  ),
  'launch'::VARCHAR,
  'the valid downgrade updates the module plan'
);

INSERT INTO public.subscription_changes (
  id,
  workspace_id,
  change_type,
  effective_at,
  status,
  created_by
)
VALUES (
  'c5000000-0000-4000-8000-000000000002',
  'c2000000-0000-4000-8000-000000000001',
  'subscription_cancel',
  NOW() - INTERVAL '1 minute',
  'pending',
  'c1000000-0000-4000-8000-000000000001'
);

SELECT is(
  public.apply_due_subscription_changes(
    'c2000000-0000-4000-8000-000000000001'
  ),
  1,
  'a full subscription cancellation applies once'
);

SELECT is(
  (
    SELECT COUNT(*)
    FROM public.workspace_module_subscriptions
    WHERE workspace_id = 'c2000000-0000-4000-8000-000000000001'
      AND status = 'cancelled'
  ),
  2::BIGINT,
  'a full cancellation cancels every active module'
);

SELECT is(
  (
    SELECT subscription_status
    FROM public.workspace_subscriptions
    WHERE workspace_id = 'c2000000-0000-4000-8000-000000000001'
  ),
  'cancelled'::VARCHAR,
  'a full cancellation updates the workspace subscription state'
);

SELECT results_eq(
  $$SELECT workspace_id FROM public.expire_due_subscription_trials()$$,
  $$VALUES ('c2000000-0000-4000-8000-000000000002'::UUID)$$,
  'the due trial is expired'
);

SELECT is(
  (
    SELECT monthly_amount
    FROM public.workspace_module_subscriptions
    WHERE id = 'c4000000-0000-4000-8000-000000000003'
  ),
  0.00::NUMERIC,
  'trial expiry replaces the old Growth amount with the Free Forever amount'
);

SELECT is(
  (
    SELECT subscription_status
    FROM public.workspace_subscriptions
    WHERE workspace_id = 'c2000000-0000-4000-8000-000000000002'
  ),
  'free'::VARCHAR,
  'trial expiry leaves an explicit Free Forever workspace state'
);

SELECT * FROM finish();
ROLLBACK;
