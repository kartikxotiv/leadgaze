BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, core, service_cloud, extensions;
SET LOCAL request.jwt.claim.role = 'service_role';

SELECT plan(18);

SELECT has_function(
  'public',
  'provision_workspace_free_forever',
  ARRAY['uuid'],
  'Free Forever workspace provisioner exists'
);

SELECT has_function(
  'public',
  'get_free_forever_provisioning_targets',
  ARRAY[]::TEXT[],
  'Free Forever provisioning preview exists'
);

SELECT has_function(
  'public',
  'apply_free_forever_provisioning',
  ARRAY['text'],
  'confirmed Free Forever batch provisioner exists'
);

INSERT INTO public.accounts (id, name, email, created_at, updated_at)
VALUES (
  'b1000000-0000-4000-8000-000000000001',
  'Free Provisioning Owner',
  'free-provisioning@leadgaze.invalid',
  NOW(),
  NOW()
);

INSERT INTO public.workspaces (id, name, slug, owner_id)
VALUES (
  'b2000000-0000-4000-8000-000000000001',
  'Free Provisioning Workspace',
  'free-provisioning-workspace',
  'b1000000-0000-4000-8000-000000000001'
);

SELECT is(
  (
    SELECT COUNT(*)
    FROM public.get_free_forever_provisioning_targets()
    WHERE workspace_id = 'b2000000-0000-4000-8000-000000000001'
  ),
  1::BIGINT,
  'an unprovisioned workspace appears in the preview'
);

SELECT throws_ok(
  $$SELECT public.apply_free_forever_provisioning('WRONG')$$,
  '22023',
  'Exact Free Forever provisioning confirmation is required',
  'batch provisioning requires exact confirmation'
);

SELECT is(
  (
    public.apply_free_forever_provisioning(
      'APPLY_FREE_FOREVER_PROVISIONING_V1'
    )->>'provisioned_workspace_count'
  )::INTEGER,
  1,
  'confirmed batch provisioning migrates the previewed workspace'
);

-- Production provisioning runs at transaction commit so an explicit paid
-- subscription created in the same transaction always wins. Execute the
-- deferred trigger now for this transactional test fixture.
SET CONSTRAINTS provision_new_workspace_free_forever_trigger IMMEDIATE;

SELECT is(
  (
    SELECT subscription_status
    FROM public.workspace_subscriptions
    WHERE workspace_id = 'b2000000-0000-4000-8000-000000000001'
  ),
  'free'::VARCHAR,
  'a newly created workspace receives a Free Forever subscription'
);

SELECT is(
  (
    SELECT COUNT(*)
    FROM public.workspace_module_subscriptions module_subscription
    JOIN public.plans plan_row ON plan_row.id = module_subscription.plan_id
    WHERE module_subscription.workspace_id = 'b2000000-0000-4000-8000-000000000001'
      AND plan_row.plan_key = 'free_forever'
  ),
  2::BIGINT,
  'Sales and Service Cloud receive explicit Free Forever plans'
);

SELECT ok(
  public.get_workspace_entitlement_context(
    'b2000000-0000-4000-8000-000000000001',
    'sales'
  ) IS NOT NULL,
  'the Sales entitlement context is immediately available'
);

SELECT ok(
  public.get_workspace_entitlement_context(
    'b2000000-0000-4000-8000-000000000001',
    'service_cloud'
  ) IS NOT NULL,
  'the Service entitlement context is immediately available'
);

SELECT lives_ok(
  $$
    SELECT public.provision_workspace_free_forever(
      'b2000000-0000-4000-8000-000000000001'
    )
  $$,
  'reprovisioning the same workspace is idempotent'
);

SELECT is(
  (
    SELECT COUNT(*)
    FROM public.workspace_module_subscriptions
    WHERE workspace_id = 'b2000000-0000-4000-8000-000000000001'
  ),
  2::BIGINT,
  'idempotent provisioning does not duplicate module subscriptions'
);

UPDATE public.workspace_module_subscriptions
SET plan_id = (SELECT id FROM public.plans WHERE plan_key = 'growth')
WHERE workspace_id = 'b2000000-0000-4000-8000-000000000001'
  AND module_id = (
    SELECT id FROM public.subscription_products WHERE product_key = 'sales'
  );

DO $$
BEGIN
  PERFORM public.provision_workspace_free_forever(
    'b2000000-0000-4000-8000-000000000001'
  );
END
$$;

SELECT is(
  (
    SELECT plan_row.plan_key
    FROM public.workspace_module_subscriptions module_subscription
    JOIN public.plans plan_row ON plan_row.id = module_subscription.plan_id
    JOIN public.subscription_products product
      ON product.id = module_subscription.module_id
    WHERE module_subscription.workspace_id = 'b2000000-0000-4000-8000-000000000001'
      AND product.product_key = 'sales'
  ),
  'growth'::VARCHAR,
  'Free Forever provisioning never overwrites an explicit paid plan'
);

SELECT is(
  (
    SELECT COUNT(*)
    FROM public.usage_counters counter
    JOIN public.feature_catalog feature ON feature.id = counter.feature_id
    WHERE counter.workspace_id = 'b2000000-0000-4000-8000-000000000001'
      AND feature.module_id = (
        SELECT id FROM public.subscription_products WHERE product_key = 'service_cloud'
      )
  ),
  5::BIGINT,
  'Free Forever provisioning initializes Service numeric counters'
);

SET CONSTRAINTS provision_new_workspace_free_forever_trigger DEFERRED;

INSERT INTO public.accounts (id, name, email, created_at, updated_at)
VALUES (
  'b1000000-0000-4000-8000-000000000002',
  'Future Free Owner',
  'future-free@leadgaze.invalid',
  NOW(),
  NOW()
);

INSERT INTO public.workspaces (id, name, slug, owner_id)
VALUES (
  'b2000000-0000-4000-8000-000000000002',
  'Future Free Workspace',
  'future-free-workspace',
  'b1000000-0000-4000-8000-000000000002'
);

SET CONSTRAINTS provision_new_workspace_free_forever_trigger IMMEDIATE;

SELECT is(
  (
    SELECT subscription_status
    FROM public.workspace_subscriptions
    WHERE workspace_id = 'b2000000-0000-4000-8000-000000000002'
  ),
  'free'::VARCHAR,
  'the deferred trigger provisions future workspaces automatically'
);

SET CONSTRAINTS provision_new_workspace_free_forever_trigger DEFERRED;

INSERT INTO public.accounts (id, name, email, created_at, updated_at)
VALUES (
  'b1000000-0000-4000-8000-000000000003',
  'Legacy Paid Owner',
  'legacy-paid-free-guard@leadgaze.invalid',
  NOW(),
  NOW()
);

INSERT INTO public.workspaces (id, name, slug, owner_id)
VALUES (
  'b2000000-0000-4000-8000-000000000003',
  'Legacy Paid Free Guard',
  'legacy-paid-free-guard',
  'b1000000-0000-4000-8000-000000000003'
);

INSERT INTO public.workspace_module_seats (
  workspace_id,
  product_id,
  seats_purchased,
  status,
  billing_cycle,
  payment_provider,
  created_by
)
SELECT 'b2000000-0000-4000-8000-000000000003',
       product.id,
       1,
       'active',
       'monthly',
       'stripe',
       'b1000000-0000-4000-8000-000000000003'
FROM public.subscription_products product
WHERE product.product_key = 'sales';

SET CONSTRAINTS provision_new_workspace_free_forever_trigger IMMEDIATE;

SELECT is(
  (
    SELECT COUNT(*)
    FROM public.workspace_subscriptions
    WHERE workspace_id = 'b2000000-0000-4000-8000-000000000003'
  ),
  0::BIGINT,
  'automatic Free Forever provisioning preserves legacy paid workspaces'
);

SELECT is(
  (
    SELECT COUNT(*)
    FROM public.get_free_forever_provisioning_targets()
    WHERE workspace_id = 'b2000000-0000-4000-8000-000000000003'
  ),
  0::BIGINT,
  'legacy paid workspaces are excluded from the Free Forever preview'
);

SELECT throws_ok(
  $$
    SELECT public.provision_workspace_free_forever(
      'b2000000-0000-4000-8000-000000000003'
    )
  $$,
  '23514',
  'Workspace b2000000-0000-4000-8000-000000000003 has legacy access and requires classified pricing backfill',
  'manual Free Forever provisioning refuses legacy paid workspaces'
);

SELECT * FROM finish();
ROLLBACK;
