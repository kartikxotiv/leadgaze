/*
 * -------------------------------------------------------
 * Migration: Create Workspace and Role Management Tables
 * Date: 2026-01-24
 * Description: Creates database structure for workspace management and role-based permissions
 * This enables multi-tenant workspace isolation with fine-grained permission control
 * -------------------------------------------------------
 */

/*
 * -------------------------------------------------------
 * Section: Create ENUM Types
 * Define enumerated types for type safety and database validation
 * -------------------------------------------------------
 */

-- Workspace member status enum
DROP TYPE IF EXISTS public.workspace_member_status CASCADE;

CREATE TYPE public.workspace_member_status AS ENUM (
  'pending',   -- Invitation sent, awaiting acceptance
  'accepted',  -- User accepted and is active
  'inactive',  -- User is inactive
  'removed'    -- User was removed from workspace
);

COMMENT ON TYPE public.workspace_member_status IS 'Enumerated type for workspace membership status';

-- Permission access level enum
DROP TYPE IF EXISTS public.permission_access_level CASCADE;

CREATE TYPE public.permission_access_level AS ENUM (
  'none',      -- No access to feature
  'own',       -- Can only access records the user owns/created
  'team',      -- Can access team members records
  'all'        -- Can access all records
);

COMMENT ON TYPE public.permission_access_level IS 'Enumerated type for permission access levels';

/*
 * -------------------------------------------------------
 * Section: Workspaces Table
 * Main workspace entity for multi-tenancy
 * -------------------------------------------------------
 */

CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Workspace Identity
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  
  -- Branding
  logo_url VARCHAR(1000),
  icon_url VARCHAR(1000),
  
  -- Configuration
  settings JSONB DEFAULT '{}'::jsonb,
  
  -- Owner (FK to accounts)
  owner_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Metadata
  created_by UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS and add basic policy for workspaces
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY workspaces_policy ON public.workspaces
    FOR ALL
    TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE public.workspaces IS 'Represents a workspace/organization in the system. Each workspace is isolated for multi-tenancy.';
COMMENT ON COLUMN public.workspaces.slug IS 'URL-friendly identifier for the workspace';
COMMENT ON COLUMN public.workspaces.owner_id IS 'Account that owns this workspace';
COMMENT ON COLUMN public.workspaces.settings IS 'JSON configuration for workspace settings';

-- Indexes
CREATE INDEX idx_workspaces_slug ON public.workspaces(slug);
CREATE INDEX idx_workspaces_owner ON public.workspaces(owner_id);
CREATE INDEX idx_workspaces_active ON public.workspaces(is_active) WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.workspaces FROM authenticated, service_role;
GRANT SELECT ON public.workspaces TO authenticated, service_role;
GRANT ALL ON public.workspaces TO service_role;

/*
 * -------------------------------------------------------
 * Section: Workspace Roles Table
 * Define roles within a workspace with hierarchy
 * -------------------------------------------------------
 */

CREATE TABLE IF NOT EXISTS public.workspace_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Role Identity
  role_key VARCHAR(50) NOT NULL,
  role_name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Status & System Flag
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Hierarchy (higher = more authority)
  hierarchy_level INTEGER NOT NULL DEFAULT 0,
  
  -- Color for UI display
  color VARCHAR(7),
  
  -- Metadata
  created_by UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT workspace_roles_unique UNIQUE (workspace_id, role_key)
);

-- Enable RLS and add basic policy for workspace_roles
ALTER TABLE public.workspace_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY workspace_roles_policy ON public.workspace_roles
    FOR ALL
    TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE public.workspace_roles IS 'Defines roles available within a workspace with configurable permissions';
COMMENT ON COLUMN public.workspace_roles.role_key IS 'Unique identifier for the role within workspace (e.g., admin, manager, user)';
COMMENT ON COLUMN public.workspace_roles.hierarchy_level IS 'Role hierarchy: higher value = more authority. Admin: 100, Manager: 50, User: 10';
COMMENT ON COLUMN public.workspace_roles.is_system IS 'If true, role cannot be deleted by users';

-- Indexes
CREATE INDEX idx_workspace_roles_workspace ON public.workspace_roles(workspace_id);
CREATE INDEX idx_workspace_roles_key ON public.workspace_roles(role_key);
CREATE INDEX idx_workspace_roles_active ON public.workspace_roles(is_active) WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE public.workspace_roles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.workspace_roles FROM authenticated, service_role;
GRANT SELECT ON public.workspace_roles TO authenticated, service_role;
GRANT ALL ON public.workspace_roles TO service_role;

/*
 * -------------------------------------------------------
 * Section: Role Permissions Table
 * Maps roles to module features with granular access levels
 * -------------------------------------------------------
 */

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.workspace_roles(id) ON DELETE CASCADE,
  module_feature_id UUID NOT NULL REFERENCES public.crm_module_features(id) ON DELETE CASCADE,
  
  -- Permission Grant
  can_access BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Access Level Control
  access_level public.permission_access_level NOT NULL DEFAULT 'none'::public.permission_access_level,
  
  -- Additional Constraints
  can_view_sensitive_data BOOLEAN NOT NULL DEFAULT FALSE,
  can_override_owner BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Advanced Conditions (stored as JSON for future extensibility)
  conditions JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  created_by UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT role_permissions_unique UNIQUE (role_id, module_feature_id)
);

-- Enable RLS and add basic policy for role_permissions
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY role_permissions_policy ON public.role_permissions
    FOR ALL
    TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE public.role_permissions IS 'Maps module features to workspace roles with granular access control';
COMMENT ON COLUMN public.role_permissions.access_level IS 'Controls scope of access: own (only owned records), team (team records), all (all records)';
COMMENT ON COLUMN public.role_permissions.can_view_sensitive_data IS 'If true, user can see sensitive fields (e.g., revenue, salary)';
COMMENT ON COLUMN public.role_permissions.conditions IS 'Advanced conditions for permission evaluation (e.g., time-based, location-based)';

-- Indexes
CREATE INDEX idx_role_permissions_workspace ON public.role_permissions(workspace_id);
CREATE INDEX idx_role_permissions_role ON public.role_permissions(role_id);
CREATE INDEX idx_role_permissions_feature ON public.role_permissions(module_feature_id);
CREATE INDEX idx_role_permissions_access ON public.role_permissions(role_id, access_level);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.role_permissions FROM authenticated, service_role;
GRANT SELECT ON public.role_permissions TO authenticated, service_role;
GRANT ALL ON public.role_permissions TO service_role;

/*
 * -------------------------------------------------------
 * Section: Workspace Members Table
 * Associates users with workspaces and assigns roles
 * -------------------------------------------------------
 */

CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.workspace_roles(id) ON DELETE RESTRICT,
  
  -- Membership Status
  status public.workspace_member_status NOT NULL DEFAULT 'pending'::public.workspace_member_status,
  -- 'pending': Invitation sent, awaiting acceptance
  -- 'accepted': User accepted and is active
  -- 'inactive': User is inactive
  -- 'removed': User was removed from workspace
  
  -- Invitation Details
  invited_by UUID REFERENCES auth.users ON DELETE SET NULL,
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  
  -- Primary Contact Flag
  is_primary_contact BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Personal Settings (stored in user's workspace context)
  personal_settings JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT workspace_members_unique UNIQUE (workspace_id, user_id)
);

-- Enable RLS and add basic policy for workspace_members
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY workspace_members_policy ON public.workspace_members
    FOR ALL
    TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE public.workspace_members IS 'Associates users with workspaces and manages their role and membership status';
COMMENT ON COLUMN public.workspace_members.status IS 'Membership status: pending (invited), accepted (active), inactive, or removed';
COMMENT ON COLUMN public.workspace_members.is_primary_contact IS 'If true, this is the primary contact person for the workspace';

-- Indexes
CREATE INDEX idx_workspace_members_workspace ON public.workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX idx_workspace_members_role ON public.workspace_members(role_id);
CREATE INDEX idx_workspace_members_status ON public.workspace_members(status) WHERE status = 'accepted';
CREATE INDEX idx_workspace_members_unique_active ON public.workspace_members(workspace_id, user_id) WHERE status = 'accepted';

-- Enable RLS
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- SELECT: Users can see their own membership records or other members in workspaces they belong to
CREATE POLICY workspace_members_select ON public.workspace_members FOR SELECT TO authenticated USING (
  user_id = auth.uid()
);

-- INSERT: Service role only for initial creation. No authenticated users can insert directly.
CREATE POLICY workspace_members_insert ON public.workspace_members FOR INSERT TO service_role WITH CHECK (true);

-- UPDATE: Service role only
CREATE POLICY workspace_members_update ON public.workspace_members FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- DELETE: Service role only
CREATE POLICY workspace_members_delete ON public.workspace_members FOR DELETE TO service_role USING (true);

REVOKE ALL ON public.workspace_members FROM authenticated, service_role;
GRANT SELECT ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspace_members TO service_role;

/*
 * -------------------------------------------------------
 * Section: Deferred RLS Policies (created after workspace_members table)
 * These policies depend on workspace_members table existing
 * -------------------------------------------------------
 */

-- Add RLS policy for workspaces that references workspace_members
CREATE POLICY workspaces_read ON public.workspaces FOR SELECT TO authenticated USING (
  owner_id IN (SELECT id FROM public.accounts WHERE id = (SELECT auth.uid())::uuid)
  OR id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND status = 'accepted'
  )
);

-- Add RLS policy for workspace_roles that references workspace_members
CREATE POLICY workspace_roles_read ON public.workspace_roles FOR SELECT TO authenticated USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND status = 'accepted'
  )
);

-- Add RLS policy for role_permissions that references workspace_members
CREATE POLICY role_permissions_read ON public.role_permissions FOR SELECT TO authenticated USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND status = 'accepted'
  )
);

-- NOTE: Default roles are created per workspace in application logic
-- This section is for reference of the expected roles

/*
 * Expected roles to be created for each workspace:
 * 
 * 1. Admin (hierarchy_level: 100)
 *    - Full access to all features
 *    - Can manage users, roles, and permissions
 *    - Cannot be deleted
 * 
 * 2. Manager (hierarchy_level: 50)
 *    - Access to most features
 *    - Can manage team members and their data
 *    - Can view reports and analytics
 * 
 * 3. User (hierarchy_level: 10)
 *    - Access to basic features
 *    - Can only see/edit their own records (with some exceptions)
 *    - Limited to views and creates, minimal delete access
 * 
 * 4. Viewer (hierarchy_level: 1)
 *    - Read-only access to specific modules
 *    - Cannot create, edit, or delete
 *    - Limited to reports and views
 */

/*
 * -------------------------------------------------------
 * Section: Seed Default Permissions for System Roles
 * Will be applied when creating a new workspace
 * -------------------------------------------------------
 */

-- NOTE: Default permissions are created in application logic when a workspace is created
-- This ensures permissions align with the current module features

/*
 * Expected permission structure:
 *
 * ADMIN ROLE:
 * - All modules: can_access = TRUE, access_level = 'all'
 * - All features: can_access = TRUE
 * - No restrictions
 *
 * MANAGER ROLE:
 * - Leads, Contacts, Accounts, Opportunities: access_level = 'team'
 * - Activities, Reports: access_level = 'team'
 * - Settings: only view, no management
 * - Cannot: import, bulk delete
 *
 * USER ROLE:
 * - Basic features only: view, create, edit
 * - access_level = 'own' for most features
 * - Can schedule meetings, add notes
 * - Cannot: delete, export, import
 *
 * VIEWER ROLE:
 * - View only: view feature only
 * - access_level = 'all' (can view any record)
 * - Cannot: create, edit, delete, export, import
 */
