/*
 * Migration: Create Default Role Permissions
 * Date: 2026-01-24
 * Description: Grant all CRM features to system roles (Admin, Manager, User, Viewer)
 * This ensures workspaces have proper permissions set up by default
 */

DO $$
DECLARE
  v_workspace_id UUID;
  v_admin_role_id UUID;
  v_manager_role_id UUID;
  v_user_role_id UUID;
  v_viewer_role_id UUID;
  v_feature_id UUID;
BEGIN
  -- For each workspace that doesn't have default permissions set up
  FOR v_workspace_id IN 
    SELECT DISTINCT workspace_id FROM public.workspace_roles
  LOOP
    -- Get the system role IDs
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

    -- Insert permissions for all features if not already exists
    FOR v_feature_id IN 
      SELECT id FROM public.crm_module_features
    LOOP
      -- Admin: Full access to all
      INSERT INTO public.role_permissions (
        workspace_id, role_id, module_feature_id, 
        can_access, access_level, 
        can_view_sensitive_data, can_override_owner
      )
      SELECT v_workspace_id, v_admin_role_id, v_feature_id,
             true, 'all'::public.permission_access_level,
             true, true
      WHERE NOT EXISTS (
        SELECT 1 FROM public.role_permissions 
        WHERE role_id = v_admin_role_id AND module_feature_id = v_feature_id
      );

      -- Manager: Access to most features
      INSERT INTO public.role_permissions (
        workspace_id, role_id, module_feature_id,
        can_access, access_level,
        can_view_sensitive_data, can_override_owner
      )
      SELECT v_workspace_id, v_manager_role_id, v_feature_id,
             true, 'team'::public.permission_access_level,
             false, false
      WHERE NOT EXISTS (
        SELECT 1 FROM public.role_permissions
        WHERE role_id = v_manager_role_id AND module_feature_id = v_feature_id
      );

      -- User: Limited access
      INSERT INTO public.role_permissions (
        workspace_id, role_id, module_feature_id,
        can_access, access_level,
        can_view_sensitive_data, can_override_owner
      )
      SELECT v_workspace_id, v_user_role_id, v_feature_id,
             true, 'own'::public.permission_access_level,
             false, false
      WHERE NOT EXISTS (
        SELECT 1 FROM public.role_permissions
        WHERE role_id = v_user_role_id AND module_feature_id = v_feature_id
      );

      -- Viewer: Read-only access
      INSERT INTO public.role_permissions (
        workspace_id, role_id, module_feature_id,
        can_access, access_level,
        can_view_sensitive_data, can_override_owner
      )
      SELECT v_workspace_id, v_viewer_role_id, v_feature_id,
             true, 'all'::public.permission_access_level,
             false, false
      WHERE NOT EXISTS (
        SELECT 1 FROM public.role_permissions
        WHERE role_id = v_viewer_role_id AND module_feature_id = v_feature_id
      );
    END LOOP;
  END LOOP;
END $$;
