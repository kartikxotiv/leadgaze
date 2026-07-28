/*
 * Remove Service Cloud Teams from RBAC and product permission surfaces.
 *
 * The underlying service_cloud.teams table remains for historical ticket data
 * and internal assignment columns, but it is no longer exposed as a permissioned
 * Service Cloud module.
 */

DROP TRIGGER IF EXISTS tr_audit_log_service_teams ON service_cloud.teams;

DELETE FROM public.role_permissions rp
USING public.crm_module_features f
JOIN public.crm_modules m ON m.id = f.module_id
WHERE rp.module_feature_id = f.id
  AND m.module_key = 'service_cloud_teams';

DELETE FROM public.product_module_map pmm
USING public.crm_modules m
WHERE pmm.crm_module_id = m.id
  AND m.module_key = 'service_cloud_teams';

DELETE FROM public.crm_module_features f
USING public.crm_modules m
WHERE f.module_id = m.id
  AND m.module_key = 'service_cloud_teams';

DELETE FROM public.crm_modules
WHERE module_key = 'service_cloud_teams';
