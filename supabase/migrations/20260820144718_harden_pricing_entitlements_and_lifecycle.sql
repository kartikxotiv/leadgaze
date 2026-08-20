/*
 * Additive hardening for pricing entitlement mutations and lifecycle jobs.
 * Previous migrations remain immutable; this migration replaces functions and
 * narrows grants without changing the catalog or existing subscription data.
 */

BEGIN;

-- Counter reservations, releases, usage events, and module-user mutations are
-- server-side operations. Authenticated clients use the authorized API layer.
REVOKE EXECUTE ON FUNCTION public.try_consume_entitlement(UUID, UUID, INTEGER)
  FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.release_entitlement(UUID, UUID, INTEGER)
  FROM authenticated;
REVOKE INSERT ON public.usage_events FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.workspace_module_users
  FROM authenticated;

DROP POLICY IF EXISTS usage_events_member_insert
  ON public.usage_events;
DROP POLICY IF EXISTS workspace_module_users_admin_insert
  ON public.workspace_module_users;
DROP POLICY IF EXISTS workspace_module_users_admin_update
  ON public.workspace_module_users;
DROP POLICY IF EXISTS workspace_module_users_admin_delete
  ON public.workspace_module_users;

-- Recipients may acknowledge in-app notifications, but may not rewrite their
-- content, recipient, channel, or delivery state through PostgREST.
REVOKE UPDATE ON public.subscription_notifications FROM authenticated;
GRANT UPDATE (read_at) ON public.subscription_notifications TO authenticated;

CREATE OR REPLACE FUNCTION public.apply_due_subscription_changes(
  p_workspace_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  pending_change RECORD;
  applied_count INTEGER := 0;
  affected_count INTEGER := 0;
BEGIN
  FOR pending_change IN
    SELECT change.id,
           change.workspace_id,
           change.change_type,
           change.workspace_module_subscription_id,
           change.to_plan_id,
           module_subscription.module_id
    FROM public.subscription_changes change
    LEFT JOIN public.workspace_module_subscriptions module_subscription
      ON module_subscription.id = change.workspace_module_subscription_id
     AND module_subscription.workspace_id = change.workspace_id
    WHERE change.status = 'pending'
      AND change.effective_at <= NOW()
      AND (p_workspace_id IS NULL OR change.workspace_id = p_workspace_id)
    ORDER BY change.effective_at, change.created_at
    FOR UPDATE OF change SKIP LOCKED
  LOOP
    affected_count := 0;

    IF pending_change.change_type = 'plan_downgrade' THEN
      IF pending_change.workspace_module_subscription_id IS NULL
         OR pending_change.to_plan_id IS NULL THEN
        RAISE EXCEPTION 'Pending downgrade % is incomplete', pending_change.id
          USING ERRCODE = '23514';
      END IF;

      UPDATE public.workspace_module_subscriptions subscription
      SET plan_id = pending_change.to_plan_id,
          monthly_amount = price.monthly_price,
          annual_amount = price.annual_price,
          updated_at = NOW()
      FROM public.module_plan_prices price
      WHERE subscription.id = pending_change.workspace_module_subscription_id
        AND subscription.workspace_id = pending_change.workspace_id
        AND subscription.status IN ('active', 'trial')
        AND price.module_id = subscription.module_id
        AND price.plan_id = pending_change.to_plan_id
        AND price.is_active;

      GET DIAGNOSTICS affected_count = ROW_COUNT;

      IF affected_count <> 1 THEN
        RAISE EXCEPTION
          'Pending downgrade % did not update exactly one active module',
          pending_change.id
          USING ERRCODE = '23514';
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM public.workspace_module_subscriptions module_subscription
        JOIN public.plans plan_row ON plan_row.id = module_subscription.plan_id
        WHERE module_subscription.workspace_id = pending_change.workspace_id
          AND module_subscription.status IN ('active', 'trial')
          AND plan_row.is_paid
      ) THEN
        UPDATE public.workspace_subscriptions
        SET subscription_status = 'free',
            updated_at = NOW()
        WHERE workspace_id = pending_change.workspace_id;
      END IF;

    ELSIF pending_change.change_type = 'module_cancel' THEN
      IF pending_change.workspace_module_subscription_id IS NULL
         OR pending_change.module_id IS NULL THEN
        RAISE EXCEPTION 'Pending module cancellation % is incomplete', pending_change.id
          USING ERRCODE = '23514';
      END IF;

      UPDATE public.workspace_module_subscriptions
      SET status = 'cancelled',
          cancelled_at = NOW(),
          updated_at = NOW()
      WHERE id = pending_change.workspace_module_subscription_id
        AND workspace_id = pending_change.workspace_id
        AND status IN ('active', 'trial');

      GET DIAGNOSTICS affected_count = ROW_COUNT;

      IF affected_count <> 1 THEN
        RAISE EXCEPTION
          'Pending module cancellation % did not update exactly one active module',
          pending_change.id
          USING ERRCODE = '23514';
      END IF;

      UPDATE public.workspace_module_users
      SET status = 'removed',
          removed_at = NOW(),
          updated_at = NOW()
      WHERE workspace_id = pending_change.workspace_id
        AND module_id = pending_change.module_id
        AND status = 'active';

      IF NOT EXISTS (
        SELECT 1
        FROM public.workspace_module_subscriptions
        WHERE workspace_id = pending_change.workspace_id
          AND status IN ('active', 'trial')
      ) THEN
        UPDATE public.workspace_subscriptions
        SET subscription_status = 'cancelled',
            updated_at = NOW()
        WHERE workspace_id = pending_change.workspace_id;
      END IF;

    ELSIF pending_change.change_type = 'subscription_cancel' THEN
      UPDATE public.workspace_module_subscriptions
      SET status = 'cancelled',
          cancelled_at = NOW(),
          updated_at = NOW()
      WHERE workspace_id = pending_change.workspace_id
        AND status IN ('active', 'trial');

      GET DIAGNOSTICS affected_count = ROW_COUNT;

      IF affected_count = 0 THEN
        RAISE EXCEPTION
          'Pending subscription cancellation % found no active modules',
          pending_change.id
          USING ERRCODE = '23514';
      END IF;

      UPDATE public.workspace_module_users
      SET status = 'removed',
          removed_at = NOW(),
          updated_at = NOW()
      WHERE workspace_id = pending_change.workspace_id
        AND status = 'active';

      UPDATE public.workspace_subscriptions
      SET subscription_status = 'cancelled',
          updated_at = NOW()
      WHERE workspace_id = pending_change.workspace_id;

    ELSE
      RAISE EXCEPTION 'Unsupported pending subscription change type: %',
        pending_change.change_type
        USING ERRCODE = '23514';
    END IF;

    UPDATE public.subscription_changes
    SET status = 'applied',
        applied_at = NOW(),
        updated_at = NOW()
    WHERE id = pending_change.id
      AND status = 'pending';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Pending subscription change % was not claimable',
        pending_change.id
        USING ERRCODE = '40001';
    END IF;

    applied_count := applied_count + 1;
  END LOOP;

  RETURN applied_count;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_due_subscription_changes(UUID)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_due_subscription_changes(UUID)
  TO service_role;

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
  WHERE plan_key = 'free_forever'
    AND is_active;

  IF free_plan_id IS NULL THEN
    RAISE EXCEPTION 'Free Forever plan is not configured'
      USING ERRCODE = '23514';
  END IF;

  FOR trial_record IN
    SELECT subscription.id,
           subscription.workspace_id,
           subscription.trial_end_date
    FROM public.workspace_subscriptions subscription
    WHERE subscription.subscription_status = 'trial_active'
      AND subscription.trial_end_date <= NOW()
    FOR UPDATE SKIP LOCKED
  LOOP
    IF EXISTS (
      SELECT 1
      FROM public.workspace_module_subscriptions module_subscription
      WHERE module_subscription.workspace_subscription_id = trial_record.id
        AND module_subscription.status = 'trial'
        AND NOT EXISTS (
          SELECT 1
          FROM public.module_plan_prices price
          WHERE price.module_id = module_subscription.module_id
            AND price.plan_id = free_plan_id
            AND price.is_active
        )
    ) THEN
      RAISE EXCEPTION
        'Trial workspace % is missing an active Free Forever module price',
        trial_record.workspace_id
        USING ERRCODE = '23514';
    END IF;

    UPDATE public.workspace_module_subscriptions module_subscription
    SET plan_id = free_plan_id,
        status = 'active',
        monthly_amount = price.monthly_price,
        annual_amount = price.annual_price,
        bundle_id = NULL,
        cancelled_at = NULL,
        updated_at = NOW()
    FROM public.module_plan_prices price
    WHERE module_subscription.workspace_subscription_id = trial_record.id
      AND module_subscription.status = 'trial'
      AND price.module_id = module_subscription.module_id
      AND price.plan_id = free_plan_id
      AND price.is_active;

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
      'trial_expired:' || trial_record.id::TEXT || ':'
        || trial_record.trial_end_date::TEXT,
      jsonb_build_object('trial_end_date', trial_record.trial_end_date)
    )
    ON CONFLICT (idempotency_key) DO NOTHING;

    workspace_id := trial_record.workspace_id;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_due_subscription_trials()
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_due_subscription_trials()
  TO service_role;

COMMIT;
