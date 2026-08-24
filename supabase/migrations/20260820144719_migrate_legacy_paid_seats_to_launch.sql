/*
 * Migrate legacy paid seat subscriptions to the first paid plan (Launch).
 *
 * Purchased capacity remains authoritative in workspace_module_seats. Actual
 * active assignments are copied to workspace_module_users. Existing Growth or
 * Scale choices are never downgraded, and legacy billing rows are not changed.
 */

BEGIN;

CREATE OR REPLACE FUNCTION public.get_legacy_paid_launch_targets()
RETURNS TABLE (
  workspace_id UUID,
  workspace_name VARCHAR,
  module_id UUID,
  module_key VARCHAR,
  paid_seats INTEGER,
  active_seat_assignments INTEGER,
  target_billing_cycle public.billing_cycle,
  legacy_status public.seat_subscription_status,
  current_plan_key VARCHAR,
  recommended_action VARCHAR
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT seat.workspace_id,
         workspace.name::VARCHAR,
         seat.product_id,
         product.product_key::VARCHAR,
         seat.seats_purchased,
         (
           SELECT COUNT(*)::INTEGER
           FROM public.seat_assignments assignment
           WHERE assignment.workspace_id = seat.workspace_id
             AND assignment.product_id = seat.product_id
             AND assignment.is_active
         ),
         seat.billing_cycle,
         seat.status,
         current_plan.plan_key::VARCHAR,
         CASE
           WHEN module_subscription.id IS NULL THEN 'insert_launch'
           ELSE 'upgrade_free_to_launch'
         END::VARCHAR
  FROM public.workspace_module_seats seat
  JOIN public.workspaces workspace ON workspace.id = seat.workspace_id
  JOIN public.subscription_products product ON product.id = seat.product_id
  LEFT JOIN public.workspace_module_subscriptions module_subscription
    ON module_subscription.workspace_id = seat.workspace_id
   AND module_subscription.module_id = seat.product_id
  LEFT JOIN public.plans current_plan ON current_plan.id = module_subscription.plan_id
  WHERE product.product_key IN ('sales', 'service_cloud')
    AND product.is_active
    AND seat.status IN ('active', 'past_due')
    AND (
      module_subscription.id IS NULL
      OR current_plan.plan_key = 'free_forever'
    )
  ORDER BY workspace.name, seat.workspace_id, product.product_key;
$$;

CREATE OR REPLACE FUNCTION public.migrate_legacy_paid_seats_to_launch()
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, core, service_cloud, pg_temp
AS $$
DECLARE
  v_free_plan_id UUID;
  v_launch_plan_id UUID;
  v_launch_parent_id UUID;
  v_launch_is_paid BOOLEAN;
  v_target_module_count INTEGER := 0;
  v_workspace_subscription_count INTEGER := 0;
  v_workspace_subscription_update_count INTEGER := 0;
  v_module_subscription_count INTEGER := 0;
  v_module_user_count INTEGER := 0;
  v_usage_counter_count INTEGER := 0;
  v_paid_seat_count INTEGER := 0;
  v_assigned_seat_count INTEGER := 0;
  v_conflicting_workspace_count INTEGER := 0;
BEGIN
  IF current_user NOT IN ('postgres', 'supabase_admin')
     AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Legacy paid seat migration requires service_role'
      USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_free_plan_id
  FROM public.plans
  WHERE plan_key = 'free_forever'
    AND is_active;

  SELECT id, parent_plan_id, is_paid
  INTO v_launch_plan_id, v_launch_parent_id, v_launch_is_paid
  FROM public.plans
  WHERE plan_key = 'launch'
    AND is_active;

  IF v_free_plan_id IS NULL
     OR v_launch_plan_id IS NULL
     OR NOT COALESCE(v_launch_is_paid, FALSE)
     OR v_launch_parent_id IS DISTINCT FROM v_free_plan_id THEN
    RAISE EXCEPTION
      'Launch must be the active paid plan directly above Free Forever'
      USING ERRCODE = '23514';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('legacy_paid_seats_to_launch_v1', 0)
  );

  DROP TABLE IF EXISTS pg_temp.legacy_paid_launch_targets;

  CREATE TEMPORARY TABLE legacy_paid_launch_targets
  ON COMMIT DROP
  AS
  SELECT *
  FROM public.get_legacy_paid_launch_targets();

  SELECT COUNT(*),
         COALESCE(SUM(paid_seats), 0),
         COALESCE(SUM(active_seat_assignments), 0)
  INTO v_target_module_count, v_paid_seat_count, v_assigned_seat_count
  FROM legacy_paid_launch_targets;

  SELECT COUNT(*) INTO v_conflicting_workspace_count
  FROM (
    SELECT target.workspace_id
    FROM legacy_paid_launch_targets target
    GROUP BY target.workspace_id
    HAVING COUNT(DISTINCT target.target_billing_cycle) > 1
  ) conflicts;

  IF v_conflicting_workspace_count > 0 THEN
    RAISE EXCEPTION
      'Legacy paid seat migration has % workspace(s) with conflicting billing cycles',
      v_conflicting_workspace_count
      USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.workspace_subscriptions (
    workspace_id,
    subscription_status,
    billing_cycle,
    current_period_start,
    current_period_end
  )
  SELECT target.workspace_id,
         CASE
           WHEN BOOL_OR(target.legacy_status = 'past_due') THEN 'past_due'
           ELSE 'active'
         END,
         MIN(target.target_billing_cycle::TEXT)::public.billing_cycle,
         MIN(seat.current_period_start),
         CASE
           WHEN MIN(seat.current_period_start) IS NULL THEN NULL
           ELSE MAX(seat.current_period_end)
         END
  FROM legacy_paid_launch_targets target
  JOIN public.workspace_module_seats seat
    ON seat.workspace_id = target.workspace_id
   AND seat.product_id = target.module_id
  GROUP BY target.workspace_id
  ON CONFLICT (workspace_id) DO NOTHING;

  GET DIAGNOSTICS v_workspace_subscription_count = ROW_COUNT;

  WITH workspace_state AS (
    SELECT target.workspace_id,
           CASE
             WHEN BOOL_OR(target.legacy_status = 'past_due') THEN 'past_due'
             ELSE 'active'
           END AS subscription_status,
           MIN(target.target_billing_cycle::TEXT)::public.billing_cycle AS billing_cycle,
           MIN(seat.current_period_start) AS current_period_start,
           CASE
             WHEN MIN(seat.current_period_start) IS NULL THEN NULL
             ELSE MAX(seat.current_period_end)
           END AS current_period_end
    FROM legacy_paid_launch_targets target
    JOIN public.workspace_module_seats seat
      ON seat.workspace_id = target.workspace_id
     AND seat.product_id = target.module_id
    GROUP BY target.workspace_id
  )
  UPDATE public.workspace_subscriptions subscription
  SET subscription_status = workspace_state.subscription_status,
      billing_cycle = workspace_state.billing_cycle,
      current_period_start = COALESCE(
        workspace_state.current_period_start,
        subscription.current_period_start
      ),
      current_period_end = COALESCE(
        workspace_state.current_period_end,
        subscription.current_period_end
      ),
      updated_at = NOW()
  FROM workspace_state
  WHERE subscription.workspace_id = workspace_state.workspace_id
    AND subscription.subscription_status IN (
      'free', 'trial_expired', 'cancelled', 'expired'
    );

  GET DIAGNOSTICS v_workspace_subscription_update_count = ROW_COUNT;

  INSERT INTO public.workspace_module_subscriptions (
    workspace_subscription_id,
    workspace_id,
    module_id,
    plan_id,
    status,
    started_at,
    cancelled_at
  )
  SELECT workspace_subscription.id,
         target.workspace_id,
         target.module_id,
         v_launch_plan_id,
         'active',
         COALESCE(seat.created_at, NOW()),
         NULL
  FROM legacy_paid_launch_targets target
  JOIN public.workspace_subscriptions workspace_subscription
    ON workspace_subscription.workspace_id = target.workspace_id
  JOIN public.workspace_module_seats seat
    ON seat.workspace_id = target.workspace_id
   AND seat.product_id = target.module_id
  ON CONFLICT (workspace_id, module_id)
  DO UPDATE
  SET plan_id = EXCLUDED.plan_id,
      status = 'active',
      started_at = COALESCE(
        public.workspace_module_subscriptions.started_at,
        EXCLUDED.started_at
      ),
      cancelled_at = NULL,
      updated_at = NOW()
  WHERE public.workspace_module_subscriptions.plan_id = v_free_plan_id;

  GET DIAGNOSTICS v_module_subscription_count = ROW_COUNT;

  INSERT INTO public.workspace_module_users (
    workspace_id,
    user_id,
    module_id,
    status,
    assigned_by,
    assigned_at,
    removed_at
  )
  SELECT assignment.workspace_id,
         assignment.user_id,
         assignment.product_id,
         'active',
         assignment.assigned_by,
         assignment.assigned_at,
         NULL
  FROM public.seat_assignments assignment
  JOIN legacy_paid_launch_targets target
    ON target.workspace_id = assignment.workspace_id
   AND target.module_id = assignment.product_id
  WHERE assignment.is_active
  ON CONFLICT (workspace_id, user_id, module_id)
  DO UPDATE
  SET status = 'active',
      assigned_by = EXCLUDED.assigned_by,
      assigned_at = EXCLUDED.assigned_at,
      removed_at = NULL,
      updated_at = NOW();

  GET DIAGNOSTICS v_module_user_count = ROW_COUNT;

  INSERT INTO public.usage_counters (
    workspace_id,
    module_id,
    feature_id,
    current_usage,
    limit_value,
    last_updated_at
  )
  SELECT target.workspace_id,
         target.module_id,
         feature.id,
         usage_value.current_usage,
         entitlement.limit_value,
         NOW()
  FROM legacy_paid_launch_targets target
  JOIN public.feature_catalog feature
    ON feature.module_id = target.module_id
   AND feature.data_type = 'numeric'
   AND feature.is_active
  CROSS JOIN LATERAL (
    SELECT public.get_pricing_backfill_feature_usage(
      target.workspace_id,
      feature.feature_key
    ) AS current_usage
  ) usage_value
  LEFT JOIN LATERAL public.get_effective_plan_entitlement(
    v_launch_plan_id,
    feature.id
  ) entitlement ON TRUE
  WHERE usage_value.current_usage IS NOT NULL
  ON CONFLICT (workspace_id, module_id, feature_id)
  DO UPDATE
  SET current_usage = EXCLUDED.current_usage,
      limit_value = EXCLUDED.limit_value,
      last_updated_at = NOW();

  GET DIAGNOSTICS v_usage_counter_count = ROW_COUNT;

  IF EXISTS (
    SELECT 1
    FROM legacy_paid_launch_targets target
    LEFT JOIN public.workspace_module_subscriptions module_subscription
      ON module_subscription.workspace_id = target.workspace_id
     AND module_subscription.module_id = target.module_id
    WHERE module_subscription.id IS NULL
      OR module_subscription.plan_id <> v_launch_plan_id
      OR module_subscription.status <> 'active'
  ) THEN
    RAISE EXCEPTION
      'Legacy paid seat migration verification failed: Launch plan is missing'
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.seat_assignments assignment
    JOIN legacy_paid_launch_targets target
      ON target.workspace_id = assignment.workspace_id
     AND target.module_id = assignment.product_id
    LEFT JOIN public.workspace_module_users module_user
      ON module_user.workspace_id = assignment.workspace_id
     AND module_user.module_id = assignment.product_id
     AND module_user.user_id = assignment.user_id
     AND module_user.status = 'active'
    WHERE assignment.is_active
      AND module_user.id IS NULL
  ) THEN
    RAISE EXCEPTION
      'Legacy paid seat migration verification failed: module user is missing'
      USING ERRCODE = '23514';
  END IF;

  RETURN jsonb_build_object(
    'target_module_count', v_target_module_count,
    'workspace_subscriptions_inserted', v_workspace_subscription_count,
    'workspace_subscriptions_updated', v_workspace_subscription_update_count,
    'module_subscriptions_migrated', v_module_subscription_count,
    'module_users_migrated', v_module_user_count,
    'usage_counters_synchronized', v_usage_counter_count,
    'purchased_seats_preserved', v_paid_seat_count,
    'assigned_seats_migrated', v_assigned_seat_count,
    'unassigned_seats_preserved', v_paid_seat_count - v_assigned_seat_count,
    'completed_at', NOW()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_legacy_paid_launch_targets()
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_legacy_paid_launch_targets()
  TO service_role;

REVOKE ALL ON FUNCTION public.migrate_legacy_paid_seats_to_launch()
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.migrate_legacy_paid_seats_to_launch()
  TO service_role;

COMMENT ON FUNCTION public.get_legacy_paid_launch_targets() IS
  'Previews legacy active or past-due paid module seats that require an explicit Launch plan.';

COMMENT ON FUNCTION public.migrate_legacy_paid_seats_to_launch() IS
  'Idempotently assigns legacy paid Sales and Service modules to Launch and copies their active seat assignments without changing legacy purchased capacity.';

-- This migration is intentionally self-applying. It only inserts missing
-- module plans or upgrades an erroneous Free Forever module with an active
-- legacy paid seat. Existing Launch, Growth, and Scale plans are preserved.
SELECT public.migrate_legacy_paid_seats_to_launch();

COMMIT;
