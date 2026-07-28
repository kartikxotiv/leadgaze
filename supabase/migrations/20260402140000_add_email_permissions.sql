/*
 * -------------------------------------------------------
 * Migration: Add Email Module and Permissions
 * Date: 2026-04-02
 * Description: Adds the Email module, its features, and default permissions.
 * -------------------------------------------------------
 */

-- 1. Add the Email module
INSERT INTO public.crm_modules (module_key, module_name, description, display_order, is_system)
VALUES
  ('emails', 'Emails', 'Manage email inbox, templates, and variables', 11, TRUE)
ON CONFLICT (module_key) DO NOTHING;

-- 2. Add features for the Email module
INSERT INTO public.crm_module_features (module_id, feature_key, feature_name, description, feature_type, display_order)
SELECT m.id, f.feature_key, f.feature_name, f.description, f.feature_type::public.crm_feature_type, f.display_order
FROM public.crm_modules m
CROSS JOIN (
  SELECT 'view_inbox' as feature_key, 'View Inbox' as feature_name, 'Access the email inbox' as description, 'view' as feature_type, 1 as display_order
  UNION ALL SELECT 'send_emails', 'Send Emails', 'Send emails to leads and contacts', 'action', 2
  UNION ALL SELECT 'manage_templates', 'Manage Templates', 'Create, edit, and delete email templates', 'crud', 3
  UNION ALL SELECT 'manage_variables', 'Manage Variables', 'Create, edit, and delete email variables', 'crud', 4
) f
WHERE m.module_key = 'emails'
ON CONFLICT (module_id, feature_key) DO NOTHING;

-- 3. Grant default permissions for the new features
DO $$
DECLARE
  v_workspace_id UUID;
  v_admin_role_id UUID;
  v_feature_id UUID;
BEGIN
  -- For each workspace
  FOR v_workspace_id IN 
    SELECT DISTINCT workspace_id FROM public.workspace_roles
  LOOP
    -- Get the system role IDs
    SELECT id INTO v_admin_role_id 
      FROM public.workspace_roles 
      WHERE workspace_id = v_workspace_id AND role_key = 'admin' LIMIT 1;

    -- Insert permissions for all email features
    FOR v_feature_id IN 
      SELECT f.id FROM public.crm_module_features f JOIN public.crm_modules m ON f.module_id = m.id WHERE m.module_key = 'emails'
    LOOP
      -- Admin: Full access
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
    END LOOP;
  END LOOP;
END $$;
