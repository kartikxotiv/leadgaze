/*
 * Provision explicit Free Forever subscriptions without overwriting paid,
 * partner, trial, or otherwise explicit pricing decisions.
 *
 * Existing workspaces can be previewed and explicitly batch-provisioned only
 * when no legacy access signal exists. Future workspaces receive Free Forever
 * for every supported active module after their creation transaction commits.
 */

BEGIN;

CREATE OR REPLACE FUNCTION public.get_free_forever_provisioning_targets()
RETURNS TABLE (
  workspace_id UUID,
  workspace_name VARCHAR
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, core, pg_temp
AS $$
  SELECT workspace.id,
         workspace.name::VARCHAR
  FROM public.workspaces workspace
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.workspace_subscriptions subscription
    WHERE subscription.workspace_id = workspace.id
  )
    AND NOT EXISTS (
      SELECT 1
      FROM public.workspace_module_seats seat
      JOIN public.subscription_products product
        ON product.id = seat.product_id
      WHERE seat.workspace_id = workspace.id
        AND product.product_key IN ('sales', 'service_cloud')
        AND seat.status IN ('active', 'past_due', 'trialing')
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.module_entitlements entitlement
      JOIN public.subscription_products product
        ON product.id = entitlement.product_id
      WHERE entitlement.workspace_id = workspace.id
        AND product.product_key IN ('sales', 'service_cloud')
        AND entitlement.is_active
        AND entitlement.valid_from <= NOW()
        AND (
          entitlement.valid_until IS NULL
          OR entitlement.valid_until > NOW()
        )
    )
    AND NOT EXISTS (
      SELECT 1
      FROM core.workspace_subscriptions legacy_subscription
      WHERE legacy_subscription.workspace_id = workspace.id
        AND legacy_subscription.status NOT IN ('cancelled', 'expired')
        AND (
          legacy_subscription.expires_at IS NULL
          OR legacy_subscription.expires_at > NOW()
        )
    )
  ORDER BY workspace.name, workspace.id;
$$;

CREATE OR REPLACE FUNCTION public.provision_workspace_free_forever(
  p_workspace_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, core, service_cloud, pg_temp
AS $$
DECLARE
  free_plan_id UUID;
  workspace_subscription_id UUID;
  workspace_subscription_inserted INTEGER := 0;
  module_subscription_inserted INTEGER := 0;
  module_user_inserted INTEGER := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.workspaces WHERE id = p_workspace_id
  ) THEN
    RAISE EXCEPTION 'Workspace % does not exist', p_workspace_id
      USING ERRCODE = '23503';
  END IF;

  SELECT id INTO free_plan_id
  FROM public.plans
  WHERE plan_key = 'free_forever'
    AND is_active;

  IF free_plan_id IS NULL THEN
    RAISE EXCEPTION 'The active Free Forever plan is missing'
      USING ERRCODE = '23514';
  END IF;

  -- A missing explicit subscription is not proof that a workspace is free.
  -- Refuse to convert legacy paid, trial, partner, or core subscriptions; they
  -- must go through the classified pricing backfill instead.
  IF NOT EXISTS (
       SELECT 1
       FROM public.workspace_subscriptions subscription
       WHERE subscription.workspace_id = p_workspace_id
     )
     AND NOT EXISTS (
       SELECT 1
       FROM public.get_free_forever_provisioning_targets() target
       WHERE target.workspace_id = p_workspace_id
     ) THEN
    RAISE EXCEPTION
      'Workspace % has legacy access and requires classified pricing backfill',
      p_workspace_id
      USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.workspace_subscriptions (
    workspace_id,
    subscription_status,
    billing_cycle
  )
  VALUES (p_workspace_id, 'free', 'monthly')
  ON CONFLICT (workspace_id) DO NOTHING;

  GET DIAGNOSTICS workspace_subscription_inserted = ROW_COUNT;

  SELECT id INTO workspace_subscription_id
  FROM public.workspace_subscriptions
  WHERE workspace_id = p_workspace_id;

  INSERT INTO public.workspace_module_subscriptions (
    workspace_subscription_id,
    workspace_id,
    module_id,
    plan_id,
    status,
    started_at
  )
  SELECT workspace_subscription_id,
         p_workspace_id,
         product.id,
         free_plan_id,
         'active',
         NOW()
  FROM public.subscription_products product
  WHERE product.product_key IN ('sales', 'service_cloud')
    AND product.is_active
  ON CONFLICT (workspace_id, module_id) DO NOTHING;

  GET DIAGNOSTICS module_subscription_inserted = ROW_COUNT;

  -- Preserve legacy active user assignments in the new module-user model.
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
  JOIN public.subscription_products product
    ON product.id = assignment.product_id
  JOIN public.workspace_module_subscriptions module_subscription
    ON module_subscription.workspace_id = assignment.workspace_id
   AND module_subscription.module_id = assignment.product_id
  WHERE assignment.workspace_id = p_workspace_id
    AND assignment.is_active
    AND product.product_key IN ('sales', 'service_cloud')
  ON CONFLICT (workspace_id, user_id, module_id) DO NOTHING;

  GET DIAGNOSTICS module_user_inserted = ROW_COUNT;

  -- The module-subscription trigger creates counter rows. Replace their zero
  -- starting values with actual business-record counts for existing workspaces.
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
  WHERE module_subscription.workspace_id = p_workspace_id
    AND usage_value.current_usage IS NOT NULL
  ON CONFLICT (workspace_id, module_id, feature_id)
  DO UPDATE
  SET current_usage = EXCLUDED.current_usage,
      limit_value = EXCLUDED.limit_value,
      last_updated_at = NOW();

  RETURN jsonb_build_object(
    'workspace_id', p_workspace_id,
    'workspace_subscription_inserted', workspace_subscription_inserted,
    'module_subscriptions_inserted', module_subscription_inserted,
    'module_users_inserted', module_user_inserted
  );
END;
$$;

REVOKE ALL ON FUNCTION public.provision_workspace_free_forever(UUID)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provision_workspace_free_forever(UUID)
  TO service_role;

REVOKE ALL ON FUNCTION public.get_free_forever_provisioning_targets()
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_free_forever_provisioning_targets()
  TO service_role;

CREATE OR REPLACE FUNCTION public.apply_free_forever_provisioning(
  p_confirmation TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target RECORD;
  provisioned_count INTEGER := 0;
BEGIN
  IF p_confirmation <> 'APPLY_FREE_FOREVER_PROVISIONING_V1' THEN
    RAISE EXCEPTION 'Exact Free Forever provisioning confirmation is required'
      USING ERRCODE = '22023';
  END IF;

  IF current_user NOT IN ('postgres', 'supabase_admin')
     AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Free Forever provisioning requires service_role'
      USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('free_forever_provisioning_v1', 0)
  );

  FOR target IN
    SELECT workspace_id
    FROM public.get_free_forever_provisioning_targets()
  LOOP
    PERFORM public.provision_workspace_free_forever(target.workspace_id);
    provisioned_count := provisioned_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'provisioned_workspace_count', provisioned_count,
    'completed_at', NOW()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_free_forever_provisioning(TEXT)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_free_forever_provisioning(TEXT)
  TO service_role;

CREATE OR REPLACE FUNCTION public.provision_new_workspace_free_forever()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.get_free_forever_provisioning_targets() target
    WHERE target.workspace_id = NEW.id
  ) THEN
    PERFORM public.provision_workspace_free_forever(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_new_workspace_free_forever()
  FROM PUBLIC;

DROP TRIGGER IF EXISTS provision_new_workspace_free_forever_trigger
  ON public.workspaces;

CREATE CONSTRAINT TRIGGER provision_new_workspace_free_forever_trigger
AFTER INSERT ON public.workspaces
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.provision_new_workspace_free_forever();

COMMIT;
