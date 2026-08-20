/* Requires the pricing foundation and guarded workspace backfill helpers. */

BEGIN;

CREATE OR REPLACE FUNCTION public.sync_workspace_module_entitlement_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.usage_counters (
    workspace_id,
    module_id,
    feature_id,
    current_usage,
    limit_value,
    last_updated_at
  )
  SELECT NEW.workspace_id,
         NEW.module_id,
         feature.id,
         0,
         entitlement.limit_value,
         NOW()
  FROM public.feature_catalog feature
  JOIN LATERAL public.get_effective_plan_entitlement(
    NEW.plan_id,
    feature.id
  ) entitlement ON TRUE
  WHERE feature.module_id = NEW.module_id
    AND feature.is_active
    AND entitlement.limit_type = 'numeric'
    AND entitlement.is_enabled
  ON CONFLICT (workspace_id, module_id, feature_id)
  DO UPDATE
  SET limit_value = EXCLUDED.limit_value,
      last_updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_workspace_module_entitlement_limits_trigger
  ON public.workspace_module_subscriptions;

CREATE TRIGGER sync_workspace_module_entitlement_limits_trigger
AFTER INSERT OR UPDATE OF plan_id, module_id
ON public.workspace_module_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.sync_workspace_module_entitlement_limits();

-- Synchronize existing explicit module plans. This deliberately preserves
-- current_usage, including values above a downgraded plan's new limit.
INSERT INTO public.usage_counters (
  workspace_id,
  module_id,
  feature_id,
  current_usage,
  limit_value,
  last_updated_at
)
SELECT subscription.workspace_id,
       subscription.module_id,
       feature.id,
       0,
       entitlement.limit_value,
       NOW()
FROM public.workspace_module_subscriptions subscription
JOIN public.feature_catalog feature
  ON feature.module_id = subscription.module_id
 AND feature.is_active
JOIN LATERAL public.get_effective_plan_entitlement(
  subscription.plan_id,
  feature.id
) entitlement ON TRUE
WHERE entitlement.limit_type = 'numeric'
  AND entitlement.is_enabled
ON CONFLICT (workspace_id, module_id, feature_id)
DO UPDATE
SET limit_value = EXCLUDED.limit_value,
    last_updated_at = NOW();

REVOKE ALL ON FUNCTION public.sync_workspace_module_entitlement_limits()
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_workspace_module_entitlement_limits()
  TO service_role;

COMMENT ON FUNCTION public.sync_workspace_module_entitlement_limits() IS
  'Synchronizes numeric counter limits after explicit module plan changes while preserving usage for downgrade read access.';

COMMIT;
