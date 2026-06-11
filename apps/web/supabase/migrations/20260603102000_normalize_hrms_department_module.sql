/*
 * Migration: Normalize HRMS Department Module
 *
 * Departments already live in hrms.departments from the employee-core HRMS
 * migration. This migration makes the Leadgaze RBAC feature set explicit for
 * the complete department module and keeps the legacy "manage" permission as a
 * compatibility alias.
 */

INSERT INTO public.crm_modules (
    module_key,
    module_name,
    description,
    display_order,
    is_system
)
VALUES (
    'hrms_departments',
    'HRMS Departments',
    'Manage HR departments',
    52,
    TRUE
)
ON CONFLICT (module_key) DO UPDATE SET
    module_name = EXCLUDED.module_name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_system = EXCLUDED.is_system,
    updated_at = NOW();

INSERT INTO public.crm_module_features (
    module_id,
    feature_key,
    feature_name,
    description,
    feature_type,
    display_order
)
SELECT
    m.id,
    features.feature_key,
    features.feature_name,
    features.description,
    features.feature_type::public.crm_feature_type,
    features.display_order
FROM public.crm_modules m
CROSS JOIN (
    VALUES
        ('view', 'View Departments', 'View HR department directory and hierarchy', 'view', 1),
        ('create', 'Create Departments', 'Create HR departments', 'crud', 2),
        ('edit', 'Edit Departments', 'Update HR department details and hierarchy', 'crud', 3),
        ('update', 'Update Departments', 'Legacy alias for editing HR departments', 'crud', 4),
        ('delete', 'Delete Departments', 'Delete HR departments', 'crud', 5),
        ('manage', 'Manage Departments', 'Legacy manage permission for HR departments', 'crud', 6)
) AS features(feature_key, feature_name, description, feature_type, display_order)
WHERE m.module_key = 'hrms_departments'
ON CONFLICT (module_id, feature_key) DO UPDATE SET
    feature_name = EXCLUDED.feature_name,
    description = EXCLUDED.description,
    feature_type = EXCLUDED.feature_type,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();

DO $$
DECLARE
    workspace_record RECORD;
    admin_role_id UUID;
    department_module_id UUID;
BEGIN
    SELECT id INTO department_module_id
    FROM public.crm_modules
    WHERE module_key = 'hrms_departments';

    IF department_module_id IS NULL THEN
        RETURN;
    END IF;

    FOR workspace_record IN SELECT id FROM public.workspaces LOOP
        SELECT id INTO admin_role_id
        FROM public.workspace_roles
        WHERE workspace_id = workspace_record.id
          AND role_key = 'admin'
        LIMIT 1;

        IF admin_role_id IS NOT NULL THEN
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
                admin_role_id,
                f.id,
                TRUE,
                'all'::public.permission_access_level,
                TRUE,
                TRUE
            FROM public.crm_module_features f
            WHERE f.module_id = department_module_id
            ON CONFLICT (role_id, module_feature_id)
            DO UPDATE SET
                can_access = EXCLUDED.can_access,
                access_level = EXCLUDED.access_level,
                can_view_sensitive_data = EXCLUDED.can_view_sensitive_data,
                can_override_owner = EXCLUDED.can_override_owner,
                updated_at = NOW();
        END IF;
    END LOOP;
END $$;
