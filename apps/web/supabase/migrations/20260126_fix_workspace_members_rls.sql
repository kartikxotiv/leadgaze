/*
 * Migration: Fix Workspace Members RLS Infinite Recursion & Grant Permissions
 * Date: 2026-01-24
 * Description: Remove circular RLS policies and grant full CRUD permissions to authenticated users
 */

-- ============================================================
-- Fix workspace_members RLS policies
-- ============================================================

-- Drop the problematic policies
DROP POLICY IF EXISTS workspace_members_read ON public.workspace_members;
DROP POLICY IF EXISTS workspace_members_select ON public.workspace_members;
DROP POLICY IF EXISTS workspace_members_insert ON public.workspace_members;
DROP POLICY IF EXISTS workspace_members_update ON public.workspace_members;
DROP POLICY IF EXISTS workspace_members_delete ON public.workspace_members;

-- Allow SELECT for users to see their own records
CREATE POLICY workspace_members_select ON public.workspace_members FOR SELECT TO authenticated USING (
  user_id = auth.uid()
);

-- Allow INSERT for authenticated users and service_role
CREATE POLICY workspace_members_insert ON public.workspace_members FOR INSERT TO authenticated, service_role WITH CHECK (true);

-- Allow UPDATE for service_role
CREATE POLICY workspace_members_update ON public.workspace_members FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- Allow DELETE for service_role
CREATE POLICY workspace_members_delete ON public.workspace_members FOR DELETE TO service_role USING (true);

-- ============================================================
-- Fix workspaces RLS policies
-- ============================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS workspaces_read ON public.workspaces;
DROP POLICY IF EXISTS workspaces_insert ON public.workspaces;
DROP POLICY IF EXISTS workspaces_update ON public.workspaces;
DROP POLICY IF EXISTS workspaces_delete ON public.workspaces;

-- Allow SELECT for users who are owners or members
CREATE POLICY workspaces_select ON public.workspaces FOR SELECT TO authenticated USING (
  owner_id = auth.uid()
);

-- Allow INSERT for service_role and authenticated users
CREATE POLICY workspaces_insert ON public.workspaces FOR INSERT TO authenticated, service_role WITH CHECK (true);

-- Allow UPDATE for service_role
CREATE POLICY workspaces_update ON public.workspaces FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- Allow DELETE for service_role
CREATE POLICY workspaces_delete ON public.workspaces FOR DELETE TO service_role USING (true);

-- ============================================================
-- Grant CRUD permissions to all users for workspaces table
-- ============================================================

REVOKE ALL ON public.workspaces FROM anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;

-- ============================================================
-- Fix workspace_roles RLS policies
-- ============================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS workspace_roles_read ON public.workspace_roles;
DROP POLICY IF EXISTS workspace_roles_insert ON public.workspace_roles;
DROP POLICY IF EXISTS workspace_roles_update ON public.workspace_roles;
DROP POLICY IF EXISTS workspace_roles_delete ON public.workspace_roles;

-- Allow all operations for service_role
CREATE POLICY workspace_roles_insert ON public.workspace_roles FOR INSERT TO authenticated, service_role WITH CHECK (true);
CREATE POLICY workspace_roles_update ON public.workspace_roles FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY workspace_roles_delete ON public.workspace_roles FOR DELETE TO service_role USING (true);
CREATE POLICY workspace_roles_select ON public.workspace_roles FOR SELECT TO authenticated USING (true);

-- ============================================================
-- Grant CRUD permissions to all users for workspace_roles table
-- ============================================================

REVOKE ALL ON public.workspace_roles FROM anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_roles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_roles TO authenticated;
GRANT ALL ON public.workspace_roles TO service_role;

-- ============================================================
-- Fix role_permissions RLS policies
-- ============================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS role_permissions_read ON public.role_permissions;
DROP POLICY IF EXISTS role_permissions_insert ON public.role_permissions;
DROP POLICY IF EXISTS role_permissions_update ON public.role_permissions;
DROP POLICY IF EXISTS role_permissions_delete ON public.role_permissions;

-- Allow all operations for authenticated and service_role
CREATE POLICY role_permissions_select ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY role_permissions_insert ON public.role_permissions FOR INSERT TO authenticated, service_role WITH CHECK (true);
CREATE POLICY role_permissions_update ON public.role_permissions FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY role_permissions_delete ON public.role_permissions FOR DELETE TO service_role USING (true);

-- ============================================================
-- Grant CRUD permissions to all users for role_permissions table
-- ============================================================

REVOKE ALL ON public.role_permissions FROM anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;

-- ============================================================
-- Grant CRUD permissions to all users for workspace_members table
-- ============================================================

REVOKE ALL ON public.workspace_members FROM anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspace_members TO service_role;
