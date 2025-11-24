

INSERT INTO public.organization_roles (role, display_name, description, permissions, hierarchy_level, is_system_role, is_active)
VALUES
(
  'sales_rep',
  'Sales Rep',
  'Sales representative with access to leads and deals',
  '{}'::jsonb,
  35,
  false,
  true
),
(
  'sales_manager',
  'Sales Manager',
  'Manage sales team, leads, and deals',
  '{}'::jsonb,
  55,
  false,
  true
),
(
  'project_manager',
  'Project Manager',
  'Manage projects and team tasks',
  '{}'::jsonb,
  55,
  false,
  true
),
(
  'marketing_manager',
  'Marketing Manager',
  'Manage marketing campaigns and analytics',
  '{}'::jsonb,
  55,
  false,
  true
),
(
  'workspace_admin',
  'Workspace Admin',
  'Admin access to workspace settings and management',
  '{}'::jsonb,
  75,
  false,
  true
),
(
  'system_admin',
  'System Admin',
  'Full system administration access',
  '{}'::jsonb,
  90,
  true,
  true
)
ON CONFLICT (role) DO NOTHING;

