/*
 * Remove selected common Settings permissions from Service Cloud roles.
 *
 * These settings permissions are intentionally not shown in /home/services/roles:
 * - Manage Modules
 * - Manage Custom Fields
 * - Manage Pipelines
 * - Manage Users
 *
 * The crm_module_features rows remain intact because the Settings module is
 * shared by other products. This migration only removes existing assignments
 * from Service Cloud workspace roles.
 */

DELETE FROM public.role_permissions rp
USING public.workspace_roles wr,
      public.crm_module_features f,
      public.crm_modules m
WHERE rp.role_id = wr.id
  AND rp.module_feature_id = f.id
  AND f.module_id = m.id
  AND wr.product_key = 'service_cloud'
  AND m.module_key = 'settings'
  AND f.feature_key IN (
    'manage_modules',
    'manage_custom_fields',
    'manage_pipelines',
    'manage_users'
  );
