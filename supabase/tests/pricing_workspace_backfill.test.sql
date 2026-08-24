BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, core, service_cloud, extensions;
SET LOCAL request.jwt.claim.role = 'service_role';

SELECT plan(24);

INSERT INTO public.accounts (id, name, email, created_at, updated_at)
VALUES
  ('11000000-0000-0000-0000-000000000001', 'Paid Owner', 'paid-backfill@leadgaze.invalid', NOW(), NOW()),
  ('11000000-0000-0000-0000-000000000002', 'Partner Owner', 'partner-backfill@leadgaze.invalid', NOW(), NOW()),
  ('11000000-0000-0000-0000-000000000003', 'Free Owner', 'free-backfill@leadgaze.invalid', NOW(), NOW());

INSERT INTO public.workspaces (id, name, slug, owner_id)
VALUES
  ('21000000-0000-0000-0000-000000000001', 'Paid Workspace', 'paid-backfill-test', '11000000-0000-0000-0000-000000000001'),
  ('21000000-0000-0000-0000-000000000002', 'Partner Workspace', 'partner-backfill-test', '11000000-0000-0000-0000-000000000002'),
  ('21000000-0000-0000-0000-000000000003', 'Free Workspace', 'free-backfill-test', '11000000-0000-0000-0000-000000000003');

INSERT INTO public.workspace_module_seats (
  id,
  workspace_id,
  product_id,
  seats_purchased,
  status,
  billing_cycle,
  payment_provider,
  created_by
)
SELECT '31000000-0000-0000-0000-000000000001',
       '21000000-0000-0000-0000-000000000001',
       product.id,
       2,
       'active',
       'yearly',
       'stripe',
       '11000000-0000-0000-0000-000000000001'
FROM public.subscription_products product
WHERE product.product_key = 'sales';

INSERT INTO public.seat_assignments (
  seat_id,
  workspace_id,
  user_id,
  product_id,
  is_active,
  assigned_by
)
SELECT '31000000-0000-0000-0000-000000000001',
       '21000000-0000-0000-0000-000000000001',
       '11000000-0000-0000-0000-000000000001',
       product.id,
       TRUE,
       '11000000-0000-0000-0000-000000000001'
FROM public.subscription_products product
WHERE product.product_key = 'sales';

INSERT INTO public.module_entitlements (
  workspace_id,
  product_id,
  entitlement_type,
  granted_seats,
  granted_by,
  reason
)
SELECT '21000000-0000-0000-0000-000000000002',
       product.id,
       'partner',
       NULL,
       '11000000-0000-0000-0000-000000000002',
       'Step 3 partner fixture'
FROM public.subscription_products product
WHERE product.product_key = 'service_cloud';

INSERT INTO public.module_entitlements (
  workspace_id,
  product_id,
  entitlement_type,
  granted_seats,
  granted_by,
  reason
)
SELECT '21000000-0000-0000-0000-000000000003',
       product.id,
       'promo',
       1,
       '11000000-0000-0000-0000-000000000003',
       'Unsupported entitlement fixture'
FROM public.subscription_products product
WHERE product.product_key = 'service_cloud';

INSERT INTO service_cloud.customers (workspace_id, name, email, created_by)
VALUES
  ('21000000-0000-0000-0000-000000000002', 'Partner Customer One', 'one@backfill.invalid', '11000000-0000-0000-0000-000000000002'),
  ('21000000-0000-0000-0000-000000000002', 'Partner Customer Two', 'two@backfill.invalid', '11000000-0000-0000-0000-000000000002');

SELECT is(
  (public.preview_pricing_workspace_backfill()->>'workspace_count')::INTEGER,
  3,
  'preview reports every workspace'
);

SELECT is(
  (public.preview_pricing_workspace_backfill()->>'supported_module_target_count')::INTEGER,
  6,
  'preview creates two supported module decisions per workspace'
);

SELECT is(
  (public.preview_pricing_workspace_backfill()->>'launch_count')::INTEGER,
  1,
  'one paid module targets Launch'
);

SELECT is(
  (public.preview_pricing_workspace_backfill()->>'growth_count')::INTEGER,
  1,
  'one partner module targets Growth'
);

SELECT is(
  (public.preview_pricing_workspace_backfill()->>'free_forever_count')::INTEGER,
  4,
  'modules without supported legacy access target Free Forever'
);

SELECT is(
  (public.preview_pricing_workspace_backfill()->>'blocking_issue_count')::INTEGER,
  1,
  'unsupported active entitlement is a blocker'
);

SELECT throws_ok(
  $$SELECT public.apply_pricing_workspace_backfill('WRONG')$$,
  '22023',
  'Exact backfill confirmation is required',
  'apply requires exact confirmation'
);

SELECT throws_ok(
  $$SELECT public.apply_pricing_workspace_backfill('APPLY_PRICING_WORKSPACE_BACKFILL_V1')$$,
  '23514',
  'Pricing backfill has 1 blocking validation issue(s)',
  'apply refuses unresolved preview blockers'
);

UPDATE public.module_entitlements
SET is_active = FALSE,
    revoked_at = NOW(),
    revoked_by = '11000000-0000-0000-0000-000000000003',
    revoke_reason = 'Resolved before backfill test'
WHERE workspace_id = '21000000-0000-0000-0000-000000000003'
  AND entitlement_type = 'promo';

SELECT is(
  (public.preview_pricing_workspace_backfill()->>'safe_to_apply')::BOOLEAN,
  TRUE,
  'preview becomes safe after manual entitlement resolution'
);

SELECT is(
  (
    public.apply_pricing_workspace_backfill(
      'APPLY_PRICING_WORKSPACE_BACKFILL_V1'
    )->>'workspace_subscriptions_inserted'
  )::INTEGER,
  3,
  'apply inserts one workspace subscription per workspace'
);

SELECT is(
  (SELECT COUNT(*) FROM public.workspace_module_subscriptions),
  6::BIGINT,
  'apply inserts explicit Sales and Service module plans'
);

SELECT is(
  (
    SELECT plan.plan_key
    FROM public.workspace_module_subscriptions subscription
    JOIN public.subscription_products product ON product.id = subscription.module_id
    JOIN public.plans plan ON plan.id = subscription.plan_id
    WHERE subscription.workspace_id = '21000000-0000-0000-0000-000000000001'
      AND product.product_key = 'sales'
  ),
  'launch'::VARCHAR,
  'paid Sales workspace migrates to Launch'
);

SELECT is(
  (
    SELECT plan.plan_key
    FROM public.workspace_module_subscriptions subscription
    JOIN public.subscription_products product ON product.id = subscription.module_id
    JOIN public.plans plan ON plan.id = subscription.plan_id
    WHERE subscription.workspace_id = '21000000-0000-0000-0000-000000000002'
      AND product.product_key = 'service_cloud'
  ),
  'growth'::VARCHAR,
  'partner Service workspace migrates to Growth'
);

SELECT is(
  (
    SELECT COUNT(*)
    FROM public.workspace_module_subscriptions subscription
    JOIN public.plans plan ON plan.id = subscription.plan_id
    WHERE subscription.workspace_id = '21000000-0000-0000-0000-000000000003'
      AND plan.plan_key = 'free_forever'
  ),
  2::BIGINT,
  'workspace without supported access receives both Free Forever modules'
);

SELECT is(
  (SELECT billing_cycle FROM public.workspace_subscriptions WHERE workspace_id = '21000000-0000-0000-0000-000000000001'),
  'yearly'::public.billing_cycle,
  'paid billing cycle is preserved'
);

SELECT is(
  (SELECT COUNT(*) FROM public.workspace_module_users),
  1::BIGINT,
  'active seat assignment becomes a module-user assignment'
);

SELECT is(
  (
    SELECT counter.current_usage
    FROM public.usage_counters counter
    JOIN public.feature_catalog feature ON feature.id = counter.feature_id
    WHERE counter.workspace_id = '21000000-0000-0000-0000-000000000002'
      AND feature.feature_key = 'service.customers'
  ),
  2,
  'Service customer counter is initialized from actual records'
);

SELECT is(
  (
    SELECT counter.limit_value
    FROM public.usage_counters counter
    JOIN public.feature_catalog feature ON feature.id = counter.feature_id
    WHERE counter.workspace_id = '21000000-0000-0000-0000-000000000002'
      AND feature.feature_key = 'service.customers'
  ),
  100000,
  'counter limit is initialized from the effective Growth entitlement'
);

SELECT is(
  (SELECT COUNT(*) FROM public.validate_pricing_workspace_backfill() WHERE severity = 'error'),
  0::BIGINT,
  'post-backfill validation contains no errors'
);

SELECT is(
  (
    public.apply_pricing_workspace_backfill(
      'APPLY_PRICING_WORKSPACE_BACKFILL_V1'
    )->>'already_applied'
  )::BOOLEAN,
  TRUE,
  'a second apply reports that the backfill already ran'
);

SELECT is(
  (SELECT COUNT(*) FROM public.workspace_subscriptions),
  3::BIGINT,
  'a second apply does not duplicate workspace subscriptions'
);

SELECT is(
  (SELECT COUNT(*) FROM public.workspace_module_subscriptions),
  6::BIGINT,
  'a second apply does not duplicate module subscriptions'
);

SELECT is(
  (SELECT COUNT(*) FROM public.workspace_module_users),
  1::BIGINT,
  'a second apply does not duplicate module users'
);

SELECT is(
  (SELECT COUNT(*) FROM public.pricing_backfill_runs WHERE status = 'completed'),
  1::BIGINT,
  'one completed audit record is retained'
);

SELECT * FROM finish();

ROLLBACK;
