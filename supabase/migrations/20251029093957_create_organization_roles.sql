-- Create organization_roles table
create table if not exists public.organization_roles (
  id uuid primary key default gen_random_uuid(),
  role varchar(50) not null unique,
  display_name varchar(100) not null,
  description text,
  permissions jsonb not null default '{}'::jsonb,
  hierarchy_level integer not null default 0,
  is_system_role boolean default false,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security (optional but recommended)
alter table public.organization_roles enable row level security;

-- Insert roles with appropriate hierarchy levels
-- Hierarchy: Owner (100) > System Admin (90) > Admin (80) > Workspace Admin (75) > Manager (60) > Sales/Project/Marketing Manager (55) > Sales Rep (35) > Viewer (20)
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
