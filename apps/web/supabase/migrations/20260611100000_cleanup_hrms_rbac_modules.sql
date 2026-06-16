/*
 * Migration: Cleanup HRMS RBAC Modules
 *
 * HRMS product access is seat-based. Role permissions should only cover
 * concrete HRMS modules, and default HRMS permissions should only be seeded for
 * Admin roles.
 */

WITH hrms_features AS (
    SELECT features.id, modules.module_key
    FROM public.crm_module_features features
    JOIN public.crm_modules modules ON modules.id = features.module_id
    WHERE modules.module_key = 'hrms'
       OR modules.module_key LIKE 'hrms_%'
)
DELETE FROM public.role_permissions permissions
USING hrms_features, public.workspace_roles roles
WHERE permissions.module_feature_id = hrms_features.id
  AND permissions.role_id = roles.id
  AND (
      hrms_features.module_key = 'hrms'
      OR roles.role_key <> 'admin'
  );

DELETE FROM public.product_module_map product_modules
USING public.crm_modules modules
WHERE product_modules.crm_module_id = modules.id
  AND (
      modules.module_key = 'hrms'
      OR (
          modules.module_key LIKE 'hrms_%'
          AND modules.module_key NOT IN (
              'hrms_employees',
              'hrms_departments',
              'hrms_documents',
              'hrms_attendance',
              'hrms_leave',
              'hrms_settings',
              'hrms_recruitment',
              'hrms_separation',
              'hrms_support_system',
              'hrms_self_service',
              'hrms_payroll',
              'hrms_reports'
          )
      )
  );

DELETE FROM public.crm_module_features features
USING public.crm_modules modules
WHERE features.module_id = modules.id
  AND modules.module_key = 'hrms';

DELETE FROM public.crm_modules
WHERE module_key = 'hrms';

UPDATE public.crm_modules
SET
    display_order = CASE module_key
        WHEN 'hrms_employees' THEN 51
        WHEN 'hrms_departments' THEN 52
        WHEN 'hrms_documents' THEN 53
        WHEN 'hrms_attendance' THEN 54
        WHEN 'hrms_leave' THEN 55
        WHEN 'hrms_settings' THEN 56
        WHEN 'hrms_recruitment' THEN 57
        WHEN 'hrms_separation' THEN 58
        WHEN 'hrms_support_system' THEN 59
        WHEN 'hrms_self_service' THEN 60
        WHEN 'hrms_payroll' THEN 61
        WHEN 'hrms_reports' THEN 62
    END,
    product_key = 'hrms',
    is_active = TRUE,
    updated_at = NOW()
WHERE module_key IN (
    'hrms_employees',
    'hrms_departments',
    'hrms_documents',
    'hrms_attendance',
    'hrms_leave',
    'hrms_settings',
    'hrms_recruitment',
    'hrms_separation',
    'hrms_support_system',
    'hrms_self_service',
    'hrms_payroll',
    'hrms_reports'
);

DO $$
DECLARE
    hrms_product_id UUID;
    module_record RECORD;
BEGIN
    SELECT id INTO hrms_product_id
    FROM public.subscription_products
    WHERE product_key = 'hrms';

    IF hrms_product_id IS NULL THEN
        RETURN;
    END IF;

    FOR module_record IN
        SELECT id
        FROM public.crm_modules
        WHERE module_key IN (
            'hrms_employees',
            'hrms_departments',
            'hrms_documents',
            'hrms_attendance',
            'hrms_leave',
            'hrms_settings',
            'hrms_recruitment',
            'hrms_separation',
            'hrms_support_system',
            'hrms_self_service',
            'hrms_payroll',
            'hrms_reports'
        )
    LOOP
        INSERT INTO public.product_module_map (product_id, crm_module_id, access_mode)
        VALUES (hrms_product_id, module_record.id, 'full')
        ON CONFLICT (product_id, crm_module_id) DO NOTHING;
    END LOOP;
END $$;
