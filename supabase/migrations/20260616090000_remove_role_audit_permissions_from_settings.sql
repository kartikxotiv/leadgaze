DELETE FROM public.role_permissions rp
USING public.crm_module_features f,
      public.crm_modules m
WHERE rp.module_feature_id = f.id
  AND f.module_id = m.id
  AND m.module_key = 'settings'
  AND f.feature_key IN (
    'manage_roles',
    'manage_permissions',
    'view_audit_log',
    'view_audit_logs'
  );

DELETE FROM public.crm_module_features f
USING public.crm_modules m
WHERE f.module_id = m.id
  AND m.module_key = 'settings'
  AND f.feature_key IN (
    'manage_roles',
    'manage_permissions',
    'view_audit_log',
    'view_audit_logs'
  );
