-- =====================================================
-- Migration: Add is_super_admin flag, custom admin roles & permissions schema
-- Date: 2026-07-28
-- Description: Multi-layer authorization model for Leadgaze admin portal.
--   Layer 1 (fast-path): public.accounts.is_super_admin
--   Layer 2 (relational/authoritative): admin.roles, admin.permissions,
--            admin.role_permissions, and admin.admin_roles
--            supporting system roles & custom roles with fine-grained permissions.
-- =====================================================

-- Ensure the admin schema exists
CREATE SCHEMA IF NOT EXISTS admin;

-- =====================================================
-- LAYER 1: Fast-path flag on accounts
-- =====================================================
ALTER TABLE public.accounts
    ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.accounts.is_super_admin IS
    'Fast-path boolean indicating super-admin status for the Leadgaze admin portal.';

-- =====================================================
-- TABLE: admin.roles
-- Stores predefined system roles and custom created roles.
-- =====================================================
CREATE TABLE IF NOT EXISTS admin.roles (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL UNIQUE,
    slug        TEXT        NOT NULL UNIQUE,
    description TEXT,
    is_system   BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE admin.roles IS 'Defines system and custom administrator roles.';

-- =====================================================
-- TABLE: admin.permissions
-- Granular permissions that can be assigned to roles.
-- =====================================================
CREATE TABLE IF NOT EXISTS admin.permissions (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL UNIQUE,
    key         TEXT        NOT NULL UNIQUE,
    description TEXT,
    category    TEXT        NOT NULL DEFAULT 'general',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE admin.permissions IS 'Defines granular platform administration permissions.';

-- =====================================================
-- TABLE: admin.role_permissions
-- Many-to-many relationship mapping roles to permissions.
-- =====================================================
CREATE TABLE IF NOT EXISTS admin.role_permissions (
    role_id       UUID REFERENCES admin.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES admin.permissions(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (role_id, permission_id)
);

COMMENT ON TABLE admin.role_permissions IS 'Maps permissions to admin roles.';

-- =====================================================
-- TABLE: admin.admin_roles
-- Authoritative, append-only user role assignment log.
-- A NULL revoked_at means the assignment is currently active.
-- =====================================================
CREATE TABLE IF NOT EXISTS admin.admin_roles (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- The account assigned the admin role
    admin_user_id  UUID        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,

    -- Foreign key referencing the roles table
    role_id        UUID        NOT NULL REFERENCES admin.roles(id) ON DELETE CASCADE,

    -- Audit: who granted this role
    assigned_by    UUID        NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,

    -- Lifecycle timestamps
    assigned_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at     TIMESTAMPTZ,          -- NULL = role is currently active
    revoked_by     UUID        REFERENCES public.accounts(id) ON DELETE SET NULL,

    -- Prevent duplicate active assignments for the same user + role_id
    CONSTRAINT uq_active_admin_role UNIQUE NULLS NOT DISTINCT (admin_user_id, role_id, revoked_at),

    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE admin.admin_roles IS
    'Authoritative assignment log linking admin accounts to roles.';

-- =====================================================
-- SEED SYSTEM ROLES & DEFAULT PERMISSIONS
-- =====================================================
INSERT INTO admin.roles (name, slug, description, is_system)
VALUES
    ('Super Admin', 'super-admin', 'Full unrestricted platform access', true),
    ('Support Agent', 'support-agent', 'Customer support and account impersonation access', true),
    ('Billing Admin', 'billing-admin', 'Subscription and plan management access', true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO admin.permissions (name, key, description, category)
VALUES
    ('Impersonate User', 'impersonate_user', 'Allows starting customer impersonation sessions', 'impersonation'),
    ('Manage Users', 'manage_users', 'Manage platform users and admin role assignments', 'users'),
    ('Manage Workspaces', 'manage_workspaces', 'Manage platform customer workspaces', 'workspaces'),
    ('Manage Roles', 'manage_roles', 'Create and edit custom admin roles and permissions', 'roles'),
    ('View Audit Logs', 'view_audit_logs', 'View admin activity and audit logs', 'audit')
ON CONFLICT (key) DO NOTHING;

-- Map all default permissions to Super Admin role
INSERT INTO admin.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin.roles r
CROSS JOIN admin.permissions p
WHERE r.slug = 'super-admin'
ON CONFLICT DO NOTHING;

-- Map impersonate_user permission to Support Agent role
INSERT INTO admin.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin.roles r
JOIN admin.permissions p ON p.key IN ('impersonate_user', 'manage_workspaces')
WHERE r.slug = 'support-agent'
ON CONFLICT DO NOTHING;

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_admin_roles_user
    ON admin.admin_roles(admin_user_id);

CREATE INDEX IF NOT EXISTS idx_admin_roles_role_id
    ON admin.admin_roles(role_id);

CREATE INDEX IF NOT EXISTS idx_admin_roles_active
    ON admin.admin_roles(admin_user_id, role_id)
    WHERE revoked_at IS NULL;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE admin.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin.admin_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS roles_policy ON admin.roles;
CREATE POLICY roles_policy ON admin.roles FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS permissions_policy ON admin.permissions;
CREATE POLICY permissions_policy ON admin.permissions FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS role_permissions_policy ON admin.role_permissions;
CREATE POLICY role_permissions_policy ON admin.role_permissions FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS admin_roles_policy ON admin.admin_roles;
CREATE POLICY admin_roles_policy ON admin.admin_roles FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

-- =====================================================
-- GRANTS
-- =====================================================
GRANT USAGE ON SCHEMA admin TO authenticated, service_role, anon;
GRANT ALL ON ALL TABLES IN SCHEMA admin TO authenticated, service_role, anon;
