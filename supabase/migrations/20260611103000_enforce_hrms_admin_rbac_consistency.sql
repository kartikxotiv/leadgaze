/*
 * Migration: Enforce HRMS Admin RBAC Consistency
 *
 * This is a forward-only follow-up to the already-applied HRMS cleanup.
 * Historical migrations are left untouched; this migration makes existing and
 * fresh databases converge on the current HRMS rules:
 *
 * - HRMS product access is seat-based, so the legacy `hrms` / "View HRMS"
 *   permission shell must not be granted through role_permissions.
 * - Default HRMS role permissions are Admin-only.
 * - The HRMS product module map should contain only the concrete HRMS modules
 *   listed below.
 */

WITH hrms_features AS (
    SELECT
        features.id AS feature_id,
        modules.module_key
    FROM public.crm_module_features features
    JOIN public.crm_modules modules ON modules.id = features.module_id
    WHERE modules.module_key = 'hrms'
       OR modules.module_key LIKE 'hrms_%'
)
DELETE FROM public.role_permissions permissions
USING hrms_features, public.workspace_roles roles
WHERE permissions.module_feature_id = hrms_features.feature_id
  AND permissions.role_id = roles.id
  AND (
      hrms_features.module_key = 'hrms'
      OR roles.role_key <> 'admin'
  );

DELETE FROM public.crm_module_features features
USING public.crm_modules modules
WHERE features.module_id = modules.id
  AND modules.module_key = 'hrms';

DELETE FROM public.crm_modules
WHERE module_key = 'hrms';

WITH allowed_hrms_modules(module_key, display_order) AS (
    VALUES
        ('hrms_employees', 51),
        ('hrms_departments', 52),
        ('hrms_documents', 53),
        ('hrms_attendance', 54),
        ('hrms_leave', 55),
        ('hrms_settings', 56),
        ('hrms_recruitment', 57),
        ('hrms_separation', 58),
        ('hrms_support_system', 59),
        ('hrms_self_service', 60),
        ('hrms_payroll', 61),
        ('hrms_reports', 62)
)
UPDATE public.crm_modules modules
SET
    display_order = allowed.display_order,
    product_key = 'hrms',
    is_active = TRUE,
    updated_at = NOW()
FROM allowed_hrms_modules allowed
WHERE modules.module_key = allowed.module_key;

WITH allowed_hrms_modules(module_key) AS (
    VALUES
        ('hrms_employees'),
        ('hrms_departments'),
        ('hrms_documents'),
        ('hrms_attendance'),
        ('hrms_leave'),
        ('hrms_settings'),
        ('hrms_recruitment'),
        ('hrms_separation'),
        ('hrms_support_system'),
        ('hrms_self_service'),
        ('hrms_payroll'),
        ('hrms_reports')
)
UPDATE public.crm_modules modules
SET
    is_active = FALSE,
    updated_at = NOW()
WHERE modules.module_key LIKE 'hrms_%'
  AND NOT EXISTS (
      SELECT 1
      FROM allowed_hrms_modules allowed
      WHERE allowed.module_key = modules.module_key
  );

WITH allowed_hrms_modules(module_key) AS (
    VALUES
        ('hrms_employees'),
        ('hrms_departments'),
        ('hrms_documents'),
        ('hrms_attendance'),
        ('hrms_leave'),
        ('hrms_settings'),
        ('hrms_recruitment'),
        ('hrms_separation'),
        ('hrms_support_system'),
        ('hrms_self_service'),
        ('hrms_payroll'),
        ('hrms_reports')
),
hrms_product AS (
    SELECT id
    FROM public.subscription_products
    WHERE product_key = 'hrms'
)
DELETE FROM public.product_module_map product_modules
USING hrms_product, public.crm_modules modules
WHERE product_modules.product_id = hrms_product.id
  AND product_modules.crm_module_id = modules.id
  AND NOT EXISTS (
      SELECT 1
      FROM allowed_hrms_modules allowed
      WHERE allowed.module_key = modules.module_key
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

    DELETE FROM public.product_module_map product_modules
    USING public.crm_modules modules
    WHERE product_modules.product_id = hrms_product_id
      AND product_modules.crm_module_id = modules.id
      AND product_modules.access_mode <> 'full'
      AND modules.module_key IN (
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
        INSERT INTO public.product_module_map (
            product_id,
            crm_module_id,
            access_mode
        )
        VALUES (
            hrms_product_id,
            module_record.id,
            'full'
        )
        ON CONFLICT (product_id, crm_module_id) DO NOTHING;
    END LOOP;
END $$;
