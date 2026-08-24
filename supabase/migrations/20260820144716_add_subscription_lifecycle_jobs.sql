/*
 * Subscription lifecycle jobs, billing events, and notification delivery.
 * Requires the scheduled subscription lifecycle processor.
 */

BEGIN;

CREATE TABLE public.billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.subscription_products(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL,
  idempotency_key VARCHAR(255) NOT NULL UNIQUE,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.subscription_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  event_key VARCHAR(255) NOT NULL,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('in_app', 'email')),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  delivery_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (delivery_status IN ('pending', 'sent', 'failed')),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  delivery_error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT subscription_notifications_delivery_shape CHECK (
    (delivery_status = 'sent' AND delivered_at IS NOT NULL)
    OR (delivery_status <> 'sent')
  ),
  CONSTRAINT subscription_notifications_event_recipient_channel_unique
    UNIQUE (event_key, recipient_id, channel)
);

CREATE INDEX billing_events_workspace_occurred_idx
  ON public.billing_events(workspace_id, occurred_at DESC);
CREATE INDEX subscription_notifications_recipient_idx
  ON public.subscription_notifications(recipient_id, created_at DESC);
CREATE INDEX subscription_notifications_pending_email_idx
  ON public.subscription_notifications(created_at)
  WHERE channel = 'email' AND delivery_status IN ('pending', 'failed');

CREATE TRIGGER subscription_notifications_updated_at
BEFORE UPDATE ON public.subscription_notifications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY billing_events_member_read ON public.billing_events
FOR SELECT TO authenticated
USING (public.current_user_can_view_workspace_subscription(workspace_id));

CREATE POLICY subscription_notifications_recipient_read
ON public.subscription_notifications
FOR SELECT TO authenticated
USING (recipient_id = auth.uid());

CREATE POLICY subscription_notifications_recipient_update
ON public.subscription_notifications
FOR UPDATE TO authenticated
USING (recipient_id = auth.uid() AND channel = 'in_app')
WITH CHECK (recipient_id = auth.uid() AND channel = 'in_app');

GRANT SELECT ON public.billing_events TO authenticated;
GRANT SELECT, UPDATE ON public.subscription_notifications TO authenticated;
GRANT ALL ON public.billing_events, public.subscription_notifications TO service_role;

CREATE OR REPLACE FUNCTION public.expire_due_subscription_trials()
RETURNS TABLE (workspace_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  trial_record RECORD;
  free_plan_id UUID;
BEGIN
  SELECT id INTO free_plan_id
  FROM public.plans
  WHERE plan_key = 'free_forever' AND is_active;

  IF free_plan_id IS NULL THEN
    RAISE EXCEPTION 'Free Forever plan is not configured';
  END IF;

  FOR trial_record IN
    SELECT subscription.id, subscription.workspace_id, subscription.trial_end_date
    FROM public.workspace_subscriptions subscription
    WHERE subscription.subscription_status = 'trial_active'
      AND subscription.trial_end_date <= NOW()
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.workspace_module_subscriptions
    SET plan_id = free_plan_id,
        status = 'active',
        bundle_id = NULL,
        cancelled_at = NULL,
        updated_at = NOW()
    WHERE workspace_subscription_id = trial_record.id
      AND status = 'trial';

    UPDATE public.workspace_subscriptions
    SET subscription_status = 'free',
        current_period_start = NULL,
        current_period_end = NULL,
        updated_at = NOW()
    WHERE id = trial_record.id;

    INSERT INTO public.billing_events (
      workspace_id,
      event_type,
      idempotency_key,
      payload
    ) VALUES (
      trial_record.workspace_id,
      'trial_expired',
      'trial_expired:' || trial_record.id::TEXT || ':' || trial_record.trial_end_date::TEXT,
      jsonb_build_object('trial_end_date', trial_record.trial_end_date)
    )
    ON CONFLICT (idempotency_key) DO NOTHING;

    workspace_id := trial_record.workspace_id;
    RETURN NEXT;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.reconcile_subscription_usage()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, core, service_cloud, pg_temp
AS $$
DECLARE
  checked_count INTEGER := 0;
  corrected_count INTEGER := 0;
  usage_record RECORD;
  actual_usage INTEGER;
BEGIN
  FOR usage_record IN
    SELECT counter.id,
           counter.workspace_id,
           feature.feature_key,
           counter.current_usage
    FROM public.usage_counters counter
    JOIN public.feature_catalog feature ON feature.id = counter.feature_id
    WHERE feature.is_active
  LOOP
    checked_count := checked_count + 1;
    actual_usage := public.get_pricing_backfill_feature_usage(
      usage_record.workspace_id,
      usage_record.feature_key
    );

    IF actual_usage IS NOT NULL AND actual_usage <> usage_record.current_usage THEN
      UPDATE public.usage_counters
      SET current_usage = actual_usage,
          last_updated_at = NOW()
      WHERE id = usage_record.id;
      corrected_count := corrected_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'checked', checked_count,
    'corrected', corrected_count,
    'completed_at', NOW()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.expire_due_subscription_trials() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reconcile_subscription_usage() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_due_subscription_trials() TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_subscription_usage() TO service_role;

COMMIT;
