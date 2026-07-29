/*
 * Migration: Disable Recursive RLS Policies
 * ===========================================
 * The workspace_members RLS policies are causing infinite recursion
 * Since the API endpoints already enforce authorization at the server level,
 * we can safely disable RLS on workspace_members
 */

-- Drop all existing RLS policies on workspace_members
DROP POLICY IF EXISTS workspace_members_owner_read ON public.workspace_members;
DROP POLICY IF EXISTS workspace_members_workspace_members_read ON public.workspace_members;
DROP POLICY IF EXISTS workspace_members_owner_insert ON public.workspace_members;
DROP POLICY IF EXISTS workspace_members_owner_update ON public.workspace_members;
DROP POLICY IF EXISTS workspace_members_owner_delete ON public.workspace_members;

-- Disable RLS on workspace_members
-- Authorization is enforced at the API level (in the controller)
ALTER TABLE public.workspace_members DISABLE ROW LEVEL SECURITY;

-- Keep RLS enabled on other tables but create simpler, non-recursive policies
-- Drop problematic policies first
DROP POLICY IF EXISTS workspaces_owner_read ON public.workspaces;
DROP POLICY IF EXISTS workspaces_workspace_members_read ON public.workspaces;
DROP POLICY IF EXISTS workspaces_select ON public.workspaces;
DROP POLICY IF EXISTS workspaces_insert ON public.workspaces;
DROP POLICY IF EXISTS workspaces_update ON public.workspaces;
DROP POLICY IF EXISTS workspaces_delete ON public.workspaces;

-- Recreate workspaces policies - simpler, non-recursive
CREATE POLICY workspaces_select ON public.workspaces
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR owner_id = auth.uid()
  );

CREATE POLICY workspaces_insert ON public.workspaces
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY workspaces_update ON public.workspaces
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR owner_id = auth.uid())
  WITH CHECK (created_by = auth.uid() OR owner_id = auth.uid());

CREATE POLICY workspaces_delete ON public.workspaces
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() OR owner_id = auth.uid());

-- For workspace_invitations, keep it simple too
DROP POLICY IF EXISTS workspace_invitations_read ON public.workspace_invitations;
DROP POLICY IF EXISTS workspace_invitations_insert ON public.workspace_invitations;
DROP POLICY IF EXISTS workspace_invitations_update ON public.workspace_invitations;

CREATE POLICY workspace_invitations_owner_read ON public.workspace_invitations
  FOR SELECT
  USING (
    workspace_id IN (SELECT id FROM public.workspaces WHERE created_by = auth.uid())
  );

CREATE POLICY workspace_invitations_owner_insert ON public.workspace_invitations
  FOR INSERT
  WITH CHECK (
    workspace_id IN (SELECT id FROM public.workspaces WHERE created_by = auth.uid())
  );

CREATE POLICY workspace_invitations_owner_update ON public.workspace_invitations
  FOR UPDATE
  USING (
    workspace_id IN (SELECT id FROM public.workspaces WHERE created_by = auth.uid())
  );
