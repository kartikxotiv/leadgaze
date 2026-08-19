/*
 * Subscription lifecycle support for pricing v1.
 *
 * Scheduled changes remain explicit rows until their billing-period boundary.
 * This function is safe to call from a scheduler, webhook, or read boundary.
 */

BEGIN;

CREATE OR REPLACE FUNCTION public.apply_due_subscription_changes(
  p_workspace_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_change RECORD;
  applied_count INTEGER := 0;
BEGIN
  FOR pending_change IN
    SELECT change.id,
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
    IF pending_change.change_type = 'plan_downgrade' THEN
      IF pending_change.to_plan_id IS NULL THEN
        RAISE EXCEPTION 'Pending downgrade % has no target plan', pending_change.id;
      END IF;

      UPDATE public.workspace_module_subscriptions subscription
      SET plan_id = pending_change.to_plan_id,
          monthly_amount = price.monthly_price,
          annual_amount = price.annual_price,
          updated_at = NOW()
      FROM public.module_plan_prices price
      WHERE subscription.id = pending_change.workspace_module_subscription_id
        AND price.module_id = subscription.module_id
        AND price.plan_id = pending_change.to_plan_id
        AND price.is_active;
    ELSIF pending_change.change_type IN ('module_cancel', 'subscription_cancel') THEN
      UPDATE public.workspace_module_subscriptions
      SET status = 'cancelled',
          cancelled_at = NOW(),
          updated_at = NOW()
      WHERE id = pending_change.workspace_module_subscription_id;

      UPDATE public.workspace_module_users
      SET status = 'removed',
          removed_at = NOW(),
          updated_at = NOW()
      WHERE module_id = pending_change.module_id
        AND status = 'active'
        AND workspace_id = (
          SELECT workspace_id
          FROM public.subscription_changes
          WHERE id = pending_change.id
        );
    END IF;

    UPDATE public.subscription_changes
    SET status = 'applied',
        applied_at = NOW(),
        updated_at = NOW()
    WHERE id = pending_change.id;

    applied_count := applied_count + 1;
  END LOOP;

  RETURN applied_count;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_due_subscription_changes(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_due_subscription_changes(UUID)
  TO service_role;

COMMIT;
