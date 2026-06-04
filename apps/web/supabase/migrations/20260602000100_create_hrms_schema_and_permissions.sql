/*
 * -------------------------------------------------------
 * Migration: Create HRMS Schema & Register Module
 * Date: 2026-06-02
 * Description:
 *   Creates the dedicated `hrms` schema and registers HRMS permissions
 *   in the existing Leadgaze workspace RBAC tables.
 *
 *   HRMS intentionally reuses:
 *   - auth.users
 *   - public.accounts
 *   - public.workspaces
 *   - public.workspace_members
 *   - public.workspace_roles
 *   - public.crm_modules / public.crm_module_features
 *   - public.role_permissions
 * -------------------------------------------------------
 */

CREATE SCHEMA IF NOT EXISTS hrms;

COMMENT ON SCHEMA hrms IS 'Dedicated schema for HRMS business-domain tables. Authentication, accounts, workspaces, roles, and permissions stay in the Leadgaze public schema.';

GRANT USAGE ON SCHEMA hrms TO authenticated, service_role, anon;

INSERT INTO public.crm_modules (module_key, module_name, description, display_order, is_system)
VALUES
  ('hrms', 'HRMS', 'Human resources module shell', 50, TRUE),
  ('hrms_employees', 'HRMS Employees', 'Manage employee profiles', 51, TRUE),
  ('hrms_departments', 'HRMS Departments', 'Manage HR departments', 52, TRUE),
  ('hrms_attendance', 'HRMS Attendance', 'Manage attendance records', 53, TRUE),
  ('hrms_leave', 'HRMS Leave', 'Manage leave requests and holidays', 54, TRUE),
  ('hrms_payroll', 'HRMS Payroll', 'Manage payroll records', 55, TRUE),
  ('hrms_settings', 'HRMS Settings', 'Manage HRMS settings', 56, TRUE)
ON CONFLICT (module_key) DO NOTHING;

INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'view' AS feature_key, 'View HRMS' AS feature_name, 'Open the HRMS module' AS description, 'view' AS feature_type, 1 AS display_order
) f
WHERE m.module_key = 'hrms'
ON CONFLICT (module_id, feature_key) DO NOTHING;

INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'view' AS feature_key, 'View Employees' AS feature_name, 'View employee profiles' AS description, 'view' AS feature_type, 1 AS display_order
  UNION ALL SELECT 'create', 'Create Employees', 'Create employee profiles', 'crud', 2
  UNION ALL SELECT 'update', 'Update Employees', 'Update employee profiles', 'crud', 3
  UNION ALL SELECT 'delete', 'Delete Employees', 'Delete employee profiles', 'crud', 4
) f
WHERE m.module_key = 'hrms_employees'
ON CONFLICT (module_id, feature_key) DO NOTHING;

INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'view' AS feature_key, 'View Departments' AS feature_name, 'View departments' AS description, 'view' AS feature_type, 1 AS display_order
  UNION ALL SELECT 'manage', 'Manage Departments', 'Create and update departments', 'crud', 2
) f
WHERE m.module_key = 'hrms_departments'
ON CONFLICT (module_id, feature_key) DO NOTHING;

INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'view' AS feature_key, 'View Attendance' AS feature_name, 'View attendance records' AS description, 'view' AS feature_type, 1 AS display_order
  UNION ALL SELECT 'manage', 'Manage Attendance', 'Create and update attendance records', 'crud', 2
) f
WHERE m.module_key = 'hrms_attendance'
ON CONFLICT (module_id, feature_key) DO NOTHING;

INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'view' AS feature_key, 'View Leave' AS feature_name, 'View leave records' AS description, 'view' AS feature_type, 1 AS display_order
  UNION ALL SELECT 'request', 'Request Leave', 'Create leave requests', 'crud', 2
  UNION ALL SELECT 'approve', 'Approve Leave', 'Approve or reject leave requests', 'action', 3
  UNION ALL SELECT 'manage', 'Manage Leave', 'Manage leave settings', 'crud', 4
) f
WHERE m.module_key = 'hrms_leave'
ON CONFLICT (module_id, feature_key) DO NOTHING;

INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'view' AS feature_key, 'View Payroll' AS feature_name, 'View payroll records' AS description, 'view' AS feature_type, 1 AS display_order
  UNION ALL SELECT 'manage', 'Manage Payroll', 'Manage payroll records', 'crud', 2
) f
WHERE m.module_key = 'hrms_payroll'
ON CONFLICT (module_id, feature_key) DO NOTHING;

INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'manage' AS feature_key, 'Manage HRMS Settings' AS feature_name, 'Manage HRMS settings' AS description, 'crud' AS feature_type, 1 AS display_order
) f
WHERE m.module_key = 'hrms_settings'
ON CONFLICT (module_id, feature_key) DO NOTHING;

DO $$
DECLARE
  v_workspace_id UUID;
  v_admin_role_id UUID;
  v_manager_role_id UUID;
  v_user_role_id UUID;
  v_viewer_role_id UUID;
  v_feature_id UUID;
BEGIN
  FOR v_workspace_id IN
    SELECT DISTINCT workspace_id FROM public.workspace_roles
  LOOP
    SELECT id INTO v_admin_role_id
      FROM public.workspace_roles
      WHERE workspace_id = v_workspace_id AND role_key = 'admin' LIMIT 1;

    SELECT id INTO v_manager_role_id
      FROM public.workspace_roles
      WHERE workspace_id = v_workspace_id AND role_key = 'manager' LIMIT 1;

    SELECT id INTO v_user_role_id
      FROM public.workspace_roles
      WHERE workspace_id = v_workspace_id AND role_key = 'user' LIMIT 1;

    SELECT id INTO v_viewer_role_id
      FROM public.workspace_roles
      WHERE workspace_id = v_workspace_id AND role_key = 'viewer' LIMIT 1;

    FOR v_feature_id IN
      SELECT f.id
      FROM public.crm_module_features f
      JOIN public.crm_modules m ON f.module_id = m.id
      WHERE m.module_key IN (
        'hrms',
        'hrms_employees',
        'hrms_departments',
        'hrms_attendance',
        'hrms_leave',
        'hrms_payroll',
        'hrms_settings'
      )
    LOOP
      INSERT INTO public.role_permissions (
        workspace_id, role_id, module_feature_id,
        can_access, access_level,
        can_view_sensitive_data, can_override_owner
      )
      SELECT v_workspace_id, v_admin_role_id, v_feature_id,
             true, 'all'::public.permission_access_level,
             true, true
      WHERE v_admin_role_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.role_permissions
          WHERE role_id = v_admin_role_id AND module_feature_id = v_feature_id
        );

      INSERT INTO public.role_permissions (
        workspace_id, role_id, module_feature_id,
        can_access, access_level,
        can_view_sensitive_data, can_override_owner
      )
      SELECT v_workspace_id, v_manager_role_id, v_feature_id,
             true, 'team'::public.permission_access_level,
             false, false
      WHERE v_manager_role_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.role_permissions
          WHERE role_id = v_manager_role_id AND module_feature_id = v_feature_id
        );

      INSERT INTO public.role_permissions (
        workspace_id, role_id, module_feature_id,
        can_access, access_level,
        can_view_sensitive_data, can_override_owner
      )
      SELECT v_workspace_id, v_user_role_id, v_feature_id,
             true, 'own'::public.permission_access_level,
             false, false
      WHERE v_user_role_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.role_permissions
          WHERE role_id = v_user_role_id AND module_feature_id = v_feature_id
        );

      INSERT INTO public.role_permissions (
        workspace_id, role_id, module_feature_id,
        can_access, access_level,
        can_view_sensitive_data, can_override_owner
      )
      SELECT v_workspace_id, v_viewer_role_id, v_feature_id,
             true, 'all'::public.permission_access_level,
             false, false
      WHERE v_viewer_role_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.role_permissions
          WHERE role_id = v_viewer_role_id AND module_feature_id = v_feature_id
        );
    END LOOP;
  END LOOP;
END $$;
