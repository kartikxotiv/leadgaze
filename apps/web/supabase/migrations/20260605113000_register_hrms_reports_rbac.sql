INSERT INTO public.crm_modules (module_key, module_name, description, display_order, is_system, is_active)
VALUES ('hrms_reports', 'HRMS Reports', 'View and export HRMS attendance, leave, payroll, and workforce reports', 62, TRUE, TRUE)
ON CONFLICT (module_key) DO UPDATE SET
    module_name = EXCLUDED.module_name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO public.crm_module_features (
    module_id,
    feature_key,
    feature_name,
    description,
    feature_type,
    display_order
)
SELECT modules.id, features.feature_key, features.feature_name, features.feature_description, features.feature_type::public.crm_feature_type, features.display_order
FROM public.crm_modules modules
CROSS JOIN (
    VALUES
        ('view', 'View Reports', 'View HRMS report dashboards and analytics', 'view', 1),
        ('export', 'Export Reports', 'Export HRMS report data', 'export', 2)
) AS features(feature_key, feature_name, feature_description, feature_type, display_order)
WHERE modules.module_key = 'hrms_reports'
ON CONFLICT (module_id, feature_key) DO UPDATE SET
    feature_name = EXCLUDED.feature_name,
    description = EXCLUDED.description,
    feature_type = EXCLUDED.feature_type,
    display_order = EXCLUDED.display_order,
    is_active = TRUE,
    updated_at = NOW();

DO $$
DECLARE
    workspace_record RECORD;
    role_record RECORD;
BEGIN
    FOR workspace_record IN SELECT id FROM public.workspaces LOOP
        FOR role_record IN
            SELECT id, role_key
            FROM public.workspace_roles
            WHERE workspace_id = workspace_record.id
              AND role_key = 'admin'
        LOOP
            INSERT INTO public.role_permissions (
                workspace_id,
                role_id,
                module_feature_id,
                can_access,
                access_level,
                can_view_sensitive_data,
                can_override_owner
            )
            SELECT
                workspace_record.id,
                role_record.id,
                features.id,
                TRUE,
                'all'::public.permission_access_level,
                TRUE,
                TRUE
            FROM public.crm_module_features features
            JOIN public.crm_modules modules ON modules.id = features.module_id
            WHERE modules.module_key = 'hrms_reports'
            ON CONFLICT (role_id, module_feature_id)
            DO UPDATE SET
                workspace_id = EXCLUDED.workspace_id,
                can_access = EXCLUDED.can_access,
                access_level = EXCLUDED.access_level,
                can_view_sensitive_data = EXCLUDED.can_view_sensitive_data,
                can_override_owner = EXCLUDED.can_override_owner,
                updated_at = NOW();
        END LOOP;
    END LOOP;
END $$;
