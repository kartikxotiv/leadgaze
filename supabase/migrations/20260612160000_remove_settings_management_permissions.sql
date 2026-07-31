/*
 * Remove deprecated Settings permissions from the global permission catalog.
 *
 * These permissions should no longer appear in any product's roles UI:
 * - Manage Modules
 * - Manage Custom Fields
 * - Manage Pipelines
 * - Manage Users
 */

DELETE FROM public.role_permissions rp
USING public.crm_module_features f,
      public.crm_modules m
WHERE rp.module_feature_id = f.id
  AND f.module_id = m.id
  AND m.module_key = 'settings'
  AND f.feature_key IN (
    'manage_modules',
    'manage_custom_fields',
    'manage_pipelines',
    'manage_users'
  );

DELETE FROM public.crm_module_features f
USING public.crm_modules m
WHERE f.module_id = m.id
  AND m.module_key = 'settings'
  AND f.feature_key IN (
    'manage_modules',
    'manage_custom_fields',
    'manage_pipelines',
    'manage_users'
  );
