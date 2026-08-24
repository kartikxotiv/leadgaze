BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;
SET LOCAL request.jwt.claim.role = 'service_role';

SELECT plan(10);

SELECT is(
  (
    SELECT entitlement.is_enabled
    FROM public.get_effective_plan_entitlement(
      (SELECT id FROM public.plans WHERE plan_key = 'free_forever'),
      (SELECT id FROM public.feature_catalog WHERE feature_key = 'sales.import_export')
    ) entitlement
  ),
  FALSE,
  'Free Forever blocks a boolean feature that is not included'
);

SELECT is(
  (
    SELECT entitlement.is_enabled
    FROM public.get_effective_plan_entitlement(
      (SELECT id FROM public.plans WHERE plan_key = 'growth'),
      (SELECT id FROM public.feature_catalog WHERE feature_key = 'sales.import_export')
    ) entitlement
  ),
  TRUE,
  'Growth inherits the enabled import/export boolean entitlement from Launch'
);

SELECT is(
  (
    SELECT monthly_price
    FROM public.bundles
    WHERE bundle_key = 'sales_service_growth_bundle'
  ),
  79.00::NUMERIC,
  'the Growth bundle has its explicit catalog price'
);

SELECT is(
  (
    SELECT SUM(price.monthly_price)
    FROM public.module_plan_prices price
    JOIN public.subscription_products product ON product.id = price.module_id
    JOIN public.plans plan_row ON plan_row.id = price.plan_id
    WHERE (product.product_key, plan_row.plan_key) IN (
      ('sales', 'growth'),
      ('service_cloud', 'free_forever')
    )
  ),
  49.00::NUMERIC,
  'mixed module plans are priced as their individual module selections'
);

SELECT cmp_ok(
  (
    SELECT monthly_price
    FROM public.bundles
    WHERE bundle_key = 'sales_service_growth_bundle'
  ),
  '<',
  (
    SELECT SUM(price.monthly_price)
    FROM public.module_plan_prices price
    JOIN public.plans plan_row ON plan_row.id = price.plan_id
    WHERE plan_row.plan_key = 'growth'
  ),
  'the Growth bundle is cheaper than buying both Growth modules separately'
);

INSERT INTO public.accounts (id, name, email, created_at, updated_at)
VALUES
  (
    'a1000000-0000-4000-8000-000000000001',
    'Release Billing Owner',
    'release-owner@leadgaze.invalid',
    NOW(),
    NOW()
  ),
  (
    'a1000000-0000-4000-8000-000000000002',
    'Release Non Owner',
    'release-non-owner@leadgaze.invalid',
    NOW(),
    NOW()
  );

INSERT INTO public.workspaces (id, name, slug, owner_id)
VALUES (
  'a2000000-0000-4000-8000-000000000001',
  'Pricing Release Verification',
  'pricing-release-verification',
  'a1000000-0000-4000-8000-000000000001'
);

SET LOCAL request.jwt.claim.sub = 'a1000000-0000-4000-8000-000000000001';

SELECT ok(
  public.current_user_is_workspace_billing_owner(
    'a2000000-0000-4000-8000-000000000001'
  ),
  'the workspace owner receives billing authorization'
);

SET LOCAL request.jwt.claim.sub = 'a1000000-0000-4000-8000-000000000002';

SELECT is(
  public.current_user_is_workspace_billing_owner(
    'a2000000-0000-4000-8000-000000000001'
  ),
  FALSE,
  'a non-owner cannot receive billing authorization'
);

INSERT INTO public.payment_events (
  payment_provider,
  provider_event_id,
  event_type,
  payload
)
VALUES ('stripe', 'evt_release_idempotency', 'invoice.payment_succeeded', '{}');

SELECT throws_ok(
  $$
    INSERT INTO public.payment_events (
      payment_provider,
      provider_event_id,
      event_type,
      payload
    ) VALUES (
      'stripe',
      'evt_release_idempotency',
      'invoice.payment_succeeded',
      '{}'
    )
  $$,
  '23505',
  'duplicate key value violates unique constraint "payment_events_provider_event_unique"',
  'Stripe webhook claims are idempotent by provider event ID'
);

INSERT INTO public.billing_events (
  workspace_id,
  event_type,
  idempotency_key
)
VALUES (
  'a2000000-0000-4000-8000-000000000001',
  'trial_ending',
  'release-cron-retry-key'
);

SELECT throws_ok(
  $$
    INSERT INTO public.billing_events (
      workspace_id,
      event_type,
      idempotency_key
    ) VALUES (
      'a2000000-0000-4000-8000-000000000001',
      'trial_ending',
      'release-cron-retry-key'
    )
  $$,
  '23505',
  'duplicate key value violates unique constraint "billing_events_idempotency_key_key"',
  'retried cron events cannot create duplicate billing events'
);

INSERT INTO public.subscription_notifications (
  workspace_id,
  recipient_id,
  event_type,
  event_key,
  channel,
  title,
  message
)
VALUES (
  'a2000000-0000-4000-8000-000000000001',
  'a1000000-0000-4000-8000-000000000001',
  'trial_ending',
  'release-notification-retry-key',
  'email',
  'Trial ending',
  'Trial ending soon'
);

SELECT throws_ok(
  $$
    INSERT INTO public.subscription_notifications (
      workspace_id,
      recipient_id,
      event_type,
      event_key,
      channel,
      title,
      message
    ) VALUES (
      'a2000000-0000-4000-8000-000000000001',
      'a1000000-0000-4000-8000-000000000001',
      'trial_ending',
      'release-notification-retry-key',
      'email',
      'Trial ending',
      'Trial ending soon'
    )
  $$,
  '23505',
  'duplicate key value violates unique constraint "subscription_notifications_event_recipient_channel_unique"',
  'notification retries remain unique per event, recipient, and channel'
);

SELECT * FROM finish();
ROLLBACK;
