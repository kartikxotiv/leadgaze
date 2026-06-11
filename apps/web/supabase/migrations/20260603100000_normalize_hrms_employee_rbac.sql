/*
 * Migration: Normalize HRMS Employee RBAC
 *
 * Keeps HRMS employee permissions aligned with Leadgaze workspace roles.
 * This is intentionally separate from the already-applied employee tables migration.
 */

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
        ('view', 'View Employees', 'View employee profiles and directory', 'view', 1),
        ('create', 'Create Employees', 'Create employee profiles', 'crud', 2),
        ('edit', 'Edit Employees', 'Update employee profile and employment details', 'crud', 3),
        ('update', 'Update Employees', 'Legacy alias for editing employee profiles', 'crud', 4),
        ('delete', 'Delete Employees', 'Delete invited employee profiles', 'crud', 5),
        ('invite', 'Invite Employees', 'Invite employees to access the workspace', 'action', 6),
        ('export', 'Export Employees', 'Export employee records', 'export', 7),
        ('manage_documents', 'Manage Employee Documents', 'Upload and manage employee documents', 'action', 8),
        ('assign_roles', 'Assign Employee Roles', 'Assign Leadgaze workspace roles to employees', 'action', 9)
) AS features(feature_key, feature_name, description, feature_type, display_order)
WHERE m.module_key = 'hrms_employees'
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
    employee_module_id UUID;
BEGIN
    SELECT id INTO employee_module_id
    FROM public.crm_modules
    WHERE module_key = 'hrms_employees';

    IF employee_module_id IS NULL THEN
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
            WHERE f.module_id = employee_module_id
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
