/*
 * Guarded one-time backfill for the plan-based pricing system.
 *
 * Applying this migration creates reporting and apply functions only. It does
 * not mutate workspace subscription data. Operators must run the preview and
 * explicitly invoke apply_pricing_workspace_backfill after reviewing blockers.
 */

BEGIN;

CREATE TABLE public.pricing_backfill_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_key VARCHAR(80) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  executed_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pricing_backfill_runs_status_check CHECK (
    status IN ('running', 'completed', 'failed')
  ),
  CONSTRAINT pricing_backfill_runs_completion_check CHECK (
    (status = 'completed' AND completed_at IS NOT NULL)
    OR (status <> 'completed' AND completed_at IS NULL)
  )
);

ALTER TABLE public.pricing_backfill_runs ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.pricing_backfill_runs TO service_role;

COMMENT ON TABLE public.pricing_backfill_runs IS
  'Audit and idempotency marker for guarded one-time pricing backfills.';

CREATE OR REPLACE FUNCTION public.get_pricing_backfill_feature_usage(
  p_workspace_id UUID,
  p_feature_key VARCHAR
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, core, service_cloud, pg_temp
AS $$
DECLARE
  usage_value INTEGER;
BEGIN
  CASE p_feature_key
    WHEN 'sales.leads' THEN
      SELECT COUNT(*)::INTEGER INTO usage_value
      FROM public.crm_leads
      WHERE workspace_id = p_workspace_id AND NOT is_deleted;
    WHEN 'sales.contacts' THEN
      SELECT COUNT(*)::INTEGER INTO usage_value
      FROM public.crm_contacts
      WHERE workspace_id = p_workspace_id AND NOT is_deleted;
    WHEN 'sales.opportunities' THEN
      SELECT COUNT(*)::INTEGER INTO usage_value
      FROM public.crm_opportunities
      WHERE workspace_id = p_workspace_id AND NOT is_deleted;
    WHEN 'sales.email_accounts', 'service.email_accounts' THEN
      SELECT COUNT(*)::INTEGER INTO usage_value
      FROM core.email_accounts
      WHERE workspace_id = p_workspace_id AND is_active;
    WHEN 'sales.website_forms' THEN
      SELECT COUNT(*)::INTEGER INTO usage_value
      FROM core.connector_forms form_row
      JOIN core.connectors connector ON connector.id = form_row.connector_id
      WHERE form_row.workspace_id = p_workspace_id
        AND connector.destination_module IN ('crm', 'sales');
    WHEN 'sales.custom_fields' THEN
      SELECT COUNT(*)::INTEGER INTO usage_value
      FROM core.entity_fields
      WHERE workspace_id = p_workspace_id
        AND product_key = 'sales'
        AND NOT is_system
        AND is_active;
    WHEN 'sales.currencies' THEN
      SELECT COUNT(*)::INTEGER INTO usage_value
      FROM core.workspace_currencies
      WHERE workspace_id = p_workspace_id AND is_active;
    WHEN 'service.tickets' THEN
      SELECT COUNT(*)::INTEGER INTO usage_value
      FROM service_cloud.tickets
      WHERE workspace_id = p_workspace_id AND NOT is_deleted;
    WHEN 'service.customers' THEN
      SELECT COUNT(*)::INTEGER INTO usage_value
      FROM service_cloud.customers
      WHERE workspace_id = p_workspace_id AND NOT is_deleted;
    WHEN 'sales.zoom_accounts', 'sales.meet_accounts' THEN
      -- No persisted provider-account table exists yet, so actual usage is zero.
      usage_value := 0;
    ELSE
      -- Per-parent limits (documents/notes per lead/ticket) are enforced from
      -- relation tables at request time and do not use workspace counters.
      usage_value := NULL;
  END CASE;

  RETURN usage_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_pricing_workspace_backfill_targets()
RETURNS TABLE (
  workspace_id UUID,
  workspace_name VARCHAR,
  module_id UUID,
  module_key VARCHAR,
  target_plan_id UUID,
  target_plan_key VARCHAR,
  assignment_reason VARCHAR,
  paid_seats INTEGER,
  active_seat_assignments INTEGER,
  valid_internal_partner_entitlements INTEGER,
  unsupported_entitlement_types TEXT[],
  target_billing_cycle public.billing_cycle,
  existing_plan_key VARCHAR,
  recommended_action VARCHAR,
  blocking_issue TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH supported_modules AS (
    SELECT product.id AS module_id, product.product_key::VARCHAR AS module_key
    FROM public.subscription_products product
    WHERE product.product_key IN ('sales', 'service_cloud')
      AND product.is_active
  ),
  target_base AS (
    SELECT workspace.id AS workspace_id,
           workspace.name::VARCHAR AS workspace_name,
           module.module_id,
           module.module_key,
           COALESCE(seat_signal.paid_seats, 0)::INTEGER AS paid_seats,
           COALESCE(seat_signal.active_assignments, 0)::INTEGER AS active_assignments,
           COALESCE(entitlement_signal.valid_count, 0)::INTEGER AS entitlement_count,
           COALESCE(entitlement_signal.unsupported_types, ARRAY[]::TEXT[]) AS unsupported_types,
           seat_signal.billing_cycle_count,
           seat_signal.billing_cycle,
           explicit_plan.plan_key::VARCHAR AS explicit_plan_key
    FROM public.workspaces workspace
    CROSS JOIN supported_modules module
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(seat.seats_purchased), 0) AS paid_seats,
             COUNT(DISTINCT seat.billing_cycle) AS billing_cycle_count,
             MIN(seat.billing_cycle::TEXT)::public.billing_cycle AS billing_cycle,
             (
               SELECT COUNT(*)
               FROM public.seat_assignments assignment
               WHERE assignment.workspace_id = workspace.id
                 AND assignment.product_id = module.module_id
                 AND assignment.is_active
             ) AS active_assignments
      FROM public.workspace_module_seats seat
      WHERE seat.workspace_id = workspace.id
        AND seat.product_id = module.module_id
        AND seat.status IN ('active', 'past_due')
    ) seat_signal ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) FILTER (
               WHERE entitlement.entitlement_type IN ('free_internal', 'partner')
             ) AS valid_count,
             ARRAY_AGG(DISTINCT entitlement.entitlement_type::TEXT) FILTER (
               WHERE entitlement.entitlement_type NOT IN ('free_internal', 'partner')
             ) AS unsupported_types
      FROM public.module_entitlements entitlement
      WHERE entitlement.workspace_id = workspace.id
        AND entitlement.product_id = module.module_id
        AND entitlement.is_active
        AND entitlement.valid_from <= NOW()
        AND (entitlement.valid_until IS NULL OR entitlement.valid_until > NOW())
    ) entitlement_signal ON TRUE
    LEFT JOIN public.workspace_module_subscriptions explicit_subscription
      ON explicit_subscription.workspace_id = workspace.id
     AND explicit_subscription.module_id = module.module_id
    LEFT JOIN public.plans explicit_plan ON explicit_plan.id = explicit_subscription.plan_id
  ),
  classified AS (
    SELECT target_base.*,
           CASE
             WHEN paid_seats > 0 THEN 'launch'
             WHEN entitlement_count > 0 THEN 'growth'
             ELSE 'free_forever'
           END::VARCHAR AS calculated_plan_key,
           CASE
             WHEN paid_seats > 0 THEN 'active_paid_seats'
             WHEN entitlement_count > 0 THEN 'internal_or_partner_entitlement'
             ELSE 'no_legacy_access'
           END::VARCHAR AS reason
    FROM target_base
  )
  SELECT classified.workspace_id,
         classified.workspace_name,
         classified.module_id,
         classified.module_key,
         target_plan.id AS target_plan_id,
         classified.calculated_plan_key AS target_plan_key,
         classified.reason AS assignment_reason,
         classified.paid_seats,
         classified.active_assignments AS active_seat_assignments,
         classified.entitlement_count AS valid_internal_partner_entitlements,
         classified.unsupported_types AS unsupported_entitlement_types,
         COALESCE(classified.billing_cycle, 'monthly'::public.billing_cycle) AS target_billing_cycle,
         classified.explicit_plan_key AS existing_plan_key,
         CASE
           WHEN classified.explicit_plan_key IS NOT NULL THEN 'preserve_explicit_plan'
           ELSE 'insert'
         END::VARCHAR AS recommended_action,
         CASE
           WHEN classified.explicit_plan_key IS NULL
             AND classified.paid_seats = 0
             AND cardinality(classified.unsupported_types) > 0
             THEN 'Unsupported active entitlement requires manual plan decision: '
                  || array_to_string(classified.unsupported_types, ', ')
           WHEN classified.explicit_plan_key IS NULL
             AND classified.billing_cycle_count > 1
             THEN 'Conflicting paid billing cycles require manual resolution'
           WHEN classified.explicit_plan_key IS NULL
             AND (
               SELECT COUNT(DISTINCT seat.billing_cycle)
               FROM public.workspace_module_seats seat
               JOIN public.subscription_products product ON product.id = seat.product_id
               WHERE seat.workspace_id = classified.workspace_id
                 AND product.product_key IN ('sales', 'service_cloud')
                 AND seat.status IN ('active', 'past_due')
             ) > 1
             THEN 'Workspace has conflicting billing cycles across paid modules'
           ELSE NULL
         END AS blocking_issue
  FROM classified
  JOIN public.plans target_plan ON target_plan.plan_key = classified.calculated_plan_key
  ORDER BY classified.workspace_name, classified.workspace_id, classified.module_key;
$$;

CREATE OR REPLACE FUNCTION public.preview_pricing_workspace_backfill()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH targets AS (
    SELECT * FROM public.get_pricing_workspace_backfill_targets()
  ),
  unsupported_modules AS (
    SELECT COUNT(*)::INTEGER AS module_count
    FROM public.workspace_module_seats seat
    JOIN public.subscription_products product ON product.id = seat.product_id
    WHERE seat.status IN ('active', 'past_due')
      AND product.product_key NOT IN ('sales', 'service_cloud')
  )
  SELECT jsonb_build_object(
    'generated_at', NOW(),
    'workspace_count', COUNT(DISTINCT workspace_id),
    'supported_module_target_count', COUNT(*),
    'insert_count', COUNT(*) FILTER (WHERE recommended_action = 'insert'),
    'preserved_explicit_count', COUNT(*) FILTER (
      WHERE recommended_action = 'preserve_explicit_plan'
    ),
    'launch_count', COUNT(*) FILTER (WHERE target_plan_key = 'launch'),
    'growth_count', COUNT(*) FILTER (WHERE target_plan_key = 'growth'),
    'free_forever_count', COUNT(*) FILTER (WHERE target_plan_key = 'free_forever'),
    'seat_assignment_count', COALESCE(SUM(active_seat_assignments), 0),
    'blocking_issue_count', COUNT(*) FILTER (WHERE blocking_issue IS NOT NULL),
    'unsupported_active_module_count', (SELECT module_count FROM unsupported_modules),
    'safe_to_apply', COUNT(*) FILTER (WHERE blocking_issue IS NOT NULL) = 0
  )
  FROM targets;
$$;

CREATE OR REPLACE FUNCTION public.apply_pricing_workspace_backfill(
  p_confirmation TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, core, service_cloud, pg_temp
AS $$
DECLARE
  v_operation_key CONSTANT TEXT := 'pricing_workspace_backfill_v1';
  existing_run RECORD;
  blocker_count INTEGER;
  workspace_subscription_count INTEGER := 0;
  module_subscription_count INTEGER := 0;
  module_user_count INTEGER := 0;
  usage_counter_count INTEGER := 0;
  result_summary JSONB;
BEGIN
  IF p_confirmation <> 'APPLY_PRICING_WORKSPACE_BACKFILL_V1' THEN
    RAISE EXCEPTION 'Exact backfill confirmation is required'
      USING ERRCODE = '22023';
  END IF;

  IF current_user NOT IN ('postgres', 'supabase_admin')
     AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Pricing backfill requires service_role'
      USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_operation_key, 0));

  SELECT * INTO existing_run
  FROM public.pricing_backfill_runs
  WHERE pricing_backfill_runs.operation_key = v_operation_key;

  IF FOUND AND existing_run.status = 'completed' THEN
    RETURN existing_run.summary || jsonb_build_object('already_applied', TRUE);
  END IF;

  SELECT COUNT(*) INTO blocker_count
  FROM public.get_pricing_workspace_backfill_targets()
  WHERE blocking_issue IS NOT NULL;

  IF blocker_count > 0 THEN
    RAISE EXCEPTION 'Pricing backfill has % blocking validation issue(s)', blocker_count
      USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.pricing_backfill_runs (
    operation_key,
    status,
    executed_by
  )
  VALUES (
    v_operation_key,
    'running',
    auth.uid()
  )
  ON CONFLICT (operation_key) DO UPDATE
  SET status = 'running',
      started_at = NOW(),
      completed_at = NULL,
      executed_by = EXCLUDED.executed_by,
      summary = '{}'::jsonb;

  WITH workspace_targets AS (
    SELECT target.workspace_id,
           CASE
             WHEN BOOL_OR(target.target_plan_key IN ('launch', 'growth')) THEN 'active'
             ELSE 'free'
           END AS subscription_status,
           COALESCE(
             MIN(target.target_billing_cycle::TEXT) FILTER (
               WHERE target.target_plan_key = 'launch'
             )::public.billing_cycle,
             'monthly'::public.billing_cycle
           ) AS billing_cycle
    FROM public.get_pricing_workspace_backfill_targets() target
    GROUP BY target.workspace_id
  )
  INSERT INTO public.workspace_subscriptions (
    workspace_id,
    subscription_status,
    billing_cycle
  )
  SELECT workspace_id, subscription_status, billing_cycle
  FROM workspace_targets
  ON CONFLICT (workspace_id) DO NOTHING;

  GET DIAGNOSTICS workspace_subscription_count = ROW_COUNT;

  INSERT INTO public.workspace_module_subscriptions (
    workspace_subscription_id,
    workspace_id,
    module_id,
    plan_id,
    status,
    started_at
  )
  SELECT workspace_subscription.id,
         target.workspace_id,
         target.module_id,
         target.target_plan_id,
         'active',
         COALESCE(
           (
             SELECT MIN(source_date)
             FROM (
               SELECT MIN(seat.created_at) AS source_date
               FROM public.workspace_module_seats seat
               WHERE seat.workspace_id = target.workspace_id
                 AND seat.product_id = target.module_id
               UNION ALL
               SELECT MIN(entitlement.valid_from)
               FROM public.module_entitlements entitlement
               WHERE entitlement.workspace_id = target.workspace_id
                 AND entitlement.product_id = target.module_id
             ) source_dates
           ),
           NOW()
         )
  FROM public.get_pricing_workspace_backfill_targets() target
  JOIN public.workspace_subscriptions workspace_subscription
    ON workspace_subscription.workspace_id = target.workspace_id
  WHERE target.recommended_action = 'insert'
  ON CONFLICT (workspace_id, module_id) DO NOTHING;

  GET DIAGNOSTICS module_subscription_count = ROW_COUNT;

  INSERT INTO public.workspace_module_users (
    workspace_id,
    user_id,
    module_id,
    status,
    assigned_by,
    assigned_at
  )
  SELECT assignment.workspace_id,
         assignment.user_id,
         assignment.product_id,
         'active',
         assignment.assigned_by,
         assignment.assigned_at
  FROM public.seat_assignments assignment
  JOIN public.subscription_products product ON product.id = assignment.product_id
  JOIN public.workspace_module_subscriptions module_subscription
    ON module_subscription.workspace_id = assignment.workspace_id
   AND module_subscription.module_id = assignment.product_id
  WHERE assignment.is_active
    AND product.product_key IN ('sales', 'service_cloud')
  ON CONFLICT (workspace_id, user_id, module_id) DO NOTHING;

  GET DIAGNOSTICS module_user_count = ROW_COUNT;

  INSERT INTO public.usage_counters (
    workspace_id,
    module_id,
    feature_id,
    current_usage,
    limit_value,
    last_updated_at
  )
  SELECT module_subscription.workspace_id,
         module_subscription.module_id,
         feature.id,
         usage_value.current_usage,
         entitlement.limit_value,
         NOW()
  FROM public.workspace_module_subscriptions module_subscription
  JOIN public.feature_catalog feature
    ON feature.module_id = module_subscription.module_id
   AND feature.data_type = 'numeric'
   AND feature.is_active
  CROSS JOIN LATERAL (
    SELECT public.get_pricing_backfill_feature_usage(
      module_subscription.workspace_id,
      feature.feature_key
    ) AS current_usage
  ) usage_value
  LEFT JOIN LATERAL public.get_effective_plan_entitlement(
    module_subscription.plan_id,
    feature.id
  ) entitlement ON TRUE
  WHERE usage_value.current_usage IS NOT NULL
  ON CONFLICT (workspace_id, module_id, feature_id) DO NOTHING;

  GET DIAGNOSTICS usage_counter_count = ROW_COUNT;

  IF EXISTS (
    SELECT 1
    FROM public.get_pricing_workspace_backfill_targets() target
    LEFT JOIN public.workspace_subscriptions workspace_subscription
      ON workspace_subscription.workspace_id = target.workspace_id
    LEFT JOIN public.workspace_module_subscriptions module_subscription
      ON module_subscription.workspace_id = target.workspace_id
     AND module_subscription.module_id = target.module_id
    WHERE workspace_subscription.id IS NULL OR module_subscription.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Backfill verification failed: explicit subscription rows are missing'
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.seat_assignments assignment
    JOIN public.subscription_products product ON product.id = assignment.product_id
    LEFT JOIN public.workspace_module_users module_user
      ON module_user.workspace_id = assignment.workspace_id
     AND module_user.user_id = assignment.user_id
     AND module_user.module_id = assignment.product_id
     AND module_user.status = 'active'
    WHERE assignment.is_active
      AND product.product_key IN ('sales', 'service_cloud')
      AND module_user.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Backfill verification failed: active seat assignments are missing'
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.workspace_module_subscriptions module_subscription
    JOIN public.feature_catalog feature
      ON feature.module_id = module_subscription.module_id
     AND feature.data_type = 'numeric'
     AND feature.is_active
    CROSS JOIN LATERAL (
      SELECT public.get_pricing_backfill_feature_usage(
        module_subscription.workspace_id,
        feature.feature_key
      ) AS current_usage
    ) expected
    LEFT JOIN public.usage_counters counter
      ON counter.workspace_id = module_subscription.workspace_id
     AND counter.module_id = module_subscription.module_id
     AND counter.feature_id = feature.id
    WHERE expected.current_usage IS NOT NULL
      AND (
        counter.id IS NULL
        OR counter.current_usage <> expected.current_usage
      )
  ) THEN
    RAISE EXCEPTION 'Backfill verification failed: usage counters are missing or inaccurate'
      USING ERRCODE = '23514';
  END IF;

  result_summary := jsonb_build_object(
    'operation_key', v_operation_key,
    'completed_at', NOW(),
    'workspace_subscriptions_inserted', workspace_subscription_count,
    'module_subscriptions_inserted', module_subscription_count,
    'module_users_inserted', module_user_count,
    'usage_counters_inserted', usage_counter_count,
    'already_applied', FALSE
  );

  UPDATE public.pricing_backfill_runs
  SET status = 'completed',
      completed_at = NOW(),
      summary = result_summary
  WHERE pricing_backfill_runs.operation_key = v_operation_key;

  RETURN result_summary;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_pricing_workspace_backfill()
RETURNS TABLE (
  severity VARCHAR,
  issue_code VARCHAR,
  workspace_id UUID,
  module_key VARCHAR,
  details JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, core, service_cloud, pg_temp
AS $$
  WITH targets AS (
    SELECT * FROM public.get_pricing_workspace_backfill_targets()
  ),
  expected_counters AS (
    SELECT module_subscription.workspace_id,
           product.product_key::VARCHAR AS module_key,
           module_subscription.module_id,
           feature.id AS feature_id,
           feature.feature_key,
           public.get_pricing_backfill_feature_usage(
             module_subscription.workspace_id,
             feature.feature_key
           ) AS expected_usage,
           entitlement.limit_value AS expected_limit
    FROM public.workspace_module_subscriptions module_subscription
    JOIN public.subscription_products product ON product.id = module_subscription.module_id
    JOIN public.feature_catalog feature
      ON feature.module_id = module_subscription.module_id
     AND feature.data_type = 'numeric'
     AND feature.is_active
    LEFT JOIN LATERAL public.get_effective_plan_entitlement(
      module_subscription.plan_id,
      feature.id
    ) entitlement ON TRUE
    WHERE product.product_key IN ('sales', 'service_cloud')
  )
  SELECT 'error'::VARCHAR,
         'missing_workspace_subscription'::VARCHAR,
         target.workspace_id,
         NULL::VARCHAR,
         jsonb_build_object('workspace_name', target.workspace_name)
  FROM targets target
  LEFT JOIN public.workspace_subscriptions subscription
    ON subscription.workspace_id = target.workspace_id
  WHERE subscription.id IS NULL
  GROUP BY target.workspace_id, target.workspace_name

  UNION ALL

  SELECT 'error'::VARCHAR,
         'missing_module_subscription'::VARCHAR,
         target.workspace_id,
         target.module_key,
         jsonb_build_object('expected_plan', target.target_plan_key)
  FROM targets target
  LEFT JOIN public.workspace_module_subscriptions subscription
    ON subscription.workspace_id = target.workspace_id
   AND subscription.module_id = target.module_id
  WHERE subscription.id IS NULL

  UNION ALL

  SELECT 'error'::VARCHAR,
         'missing_module_user'::VARCHAR,
         assignment.workspace_id,
         product.product_key::VARCHAR,
         jsonb_build_object(
           'user_id', assignment.user_id,
           'seat_assignment_id', assignment.id
         )
  FROM public.seat_assignments assignment
  JOIN public.subscription_products product ON product.id = assignment.product_id
  LEFT JOIN public.workspace_module_users module_user
    ON module_user.workspace_id = assignment.workspace_id
   AND module_user.user_id = assignment.user_id
   AND module_user.module_id = assignment.product_id
   AND module_user.status = 'active'
  WHERE assignment.is_active
    AND product.product_key IN ('sales', 'service_cloud')
    AND module_user.id IS NULL

  UNION ALL

  SELECT 'error'::VARCHAR,
         'missing_usage_counter'::VARCHAR,
         expected.workspace_id,
         expected.module_key,
         jsonb_build_object('feature_key', expected.feature_key)
  FROM expected_counters expected
  LEFT JOIN public.usage_counters counter
    ON counter.workspace_id = expected.workspace_id
   AND counter.module_id = expected.module_id
   AND counter.feature_id = expected.feature_id
  WHERE expected.expected_usage IS NOT NULL
    AND counter.id IS NULL

  UNION ALL

  SELECT 'error'::VARCHAR,
         'usage_counter_mismatch'::VARCHAR,
         expected.workspace_id,
         expected.module_key,
         jsonb_build_object(
           'feature_key', expected.feature_key,
           'expected_usage', expected.expected_usage,
           'actual_usage', counter.current_usage
         )
  FROM expected_counters expected
  JOIN public.usage_counters counter
    ON counter.workspace_id = expected.workspace_id
   AND counter.module_id = expected.module_id
   AND counter.feature_id = expected.feature_id
  WHERE expected.expected_usage IS NOT NULL
    AND counter.current_usage <> expected.expected_usage

  UNION ALL

  SELECT 'error'::VARCHAR,
         'usage_limit_mismatch'::VARCHAR,
         expected.workspace_id,
         expected.module_key,
         jsonb_build_object(
           'feature_key', expected.feature_key,
           'expected_limit', expected.expected_limit,
           'actual_limit', counter.limit_value
         )
  FROM expected_counters expected
  JOIN public.usage_counters counter
    ON counter.workspace_id = expected.workspace_id
   AND counter.module_id = expected.module_id
   AND counter.feature_id = expected.feature_id
  WHERE expected.expected_usage IS NOT NULL
    AND counter.limit_value IS DISTINCT FROM expected.expected_limit

  UNION ALL

  SELECT 'warning'::VARCHAR,
         'unsupported_active_legacy_module'::VARCHAR,
         seat.workspace_id,
         product.product_key::VARCHAR,
         jsonb_build_object('seat_id', seat.id, 'status', seat.status)
  FROM public.workspace_module_seats seat
  JOIN public.subscription_products product ON product.id = seat.product_id
  WHERE seat.status IN ('active', 'past_due')
    AND product.product_key NOT IN ('sales', 'service_cloud')

  ORDER BY 1, 2, 3, 4;
$$;

REVOKE ALL ON FUNCTION public.get_pricing_backfill_feature_usage(UUID, VARCHAR) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_pricing_workspace_backfill_targets() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.preview_pricing_workspace_backfill() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_pricing_workspace_backfill(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_pricing_workspace_backfill() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_pricing_backfill_feature_usage(UUID, VARCHAR)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.get_pricing_workspace_backfill_targets()
  TO service_role;
GRANT EXECUTE ON FUNCTION public.preview_pricing_workspace_backfill()
  TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_pricing_workspace_backfill(TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_pricing_workspace_backfill()
  TO service_role;

COMMIT;
