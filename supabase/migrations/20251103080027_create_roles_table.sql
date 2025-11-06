-- Create roles table (simple version)
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system_role boolean default false,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security for the roles table
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read active roles
CREATE POLICY "Allow authenticated users to read active roles" ON public.roles
  FOR SELECT
  TO authenticated
  USING (is_active = true); 

-- RLS Policy: Allow authenticated users to read all roles (including inactive) - useful for admin views
-- Uncomment if you need admins to see all roles
-- CREATE POLICY "Allow authenticated users to read all roles" ON public.roles
--   FOR SELECT
--   TO authenticated
--   USING (true);

-- Insert your 6 new roles (commented out - uncomment and populate as needed)
-- INSERT INTO public.roles (role, display_name, description, is_system_role, is_active)
-- VALUES
-- (
--   'sales_rep',
--   'Sales Rep',
--   NULL,
--   false,
--   true
-- ),
-- (
--   'sales_manager',
--   'Sales Manager',
--   NULL,
--   false,
--   true
-- ),
-- (
--   'project_manager',
--   'Project Manager',
--   NULL,
--   false,
--   true
-- ),
-- (
--   'marketing_manager',
--   'Marketing Manager',
--   NULL,
--   false,
--   true
-- ),
-- (
--   'workspace_admin',
--   'Workspace Admin',
--   NULL,
--   false,
--   true
-- ),
-- (
--   'system_admin',
--   'System Admin',
--   NULL,
--   true,
--   true
-- )
-- ON CONFLICT (role) DO NOTHING;
