-- =====================================================
-- Migration: Create Admin Impersonation Sessions Table
-- Date: 2026-07-28
-- Description: Creates the admin schema and the
--              impersonation_sessions table used by the
--              Leadgaze super-admin to temporarily access
--              a customer's account at application level.
--              No Supabase auth session or JWT is modified.
-- =====================================================

-- Create the admin schema if it does not already exist
CREATE SCHEMA IF NOT EXISTS admin;

-- Expose admin schema to PostgREST API
DO $$
BEGIN
    EXECUTE 'ALTER ROLE authenticator SET pgrst.db_schemas = ''public, storage, graphql_public, fundraising, core, hrms, service_cloud, admin''';
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';

-- =====================================================
-- TABLE: admin.impersonation_sessions
-- =====================================================
CREATE TABLE IF NOT EXISTS admin.impersonation_sessions (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- The Leadgaze super-admin who initiated the session
    admin_user_id UUID        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,

    -- The customer account being impersonated
    target_user_id UUID       NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,

    -- The workspace context of the impersonation (optional)
    workspace_id  UUID        REFERENCES public.workspaces(id) ON DELETE CASCADE,

    -- Mandatory reason required before starting a session
    reason        TEXT        NOT NULL,

    -- Request metadata for audit purposes
    ip_address    TEXT,
    user_agent    TEXT,

    -- Session lifetime
    started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at    TIMESTAMPTZ NOT NULL,
    ended_at      TIMESTAMPTZ,

    -- Allowed values: active | expired | terminated | completed
    status        TEXT        NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'expired', 'terminated', 'completed')),

    -- Extensible metadata blob
    metadata      JSONB       NOT NULL DEFAULT '{}'::jsonb,

    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_impersonation_admin
    ON admin.impersonation_sessions(admin_user_id);

CREATE INDEX IF NOT EXISTS idx_impersonation_target
    ON admin.impersonation_sessions(target_user_id);

CREATE INDEX IF NOT EXISTS idx_impersonation_workspace
    ON admin.impersonation_sessions(workspace_id);

CREATE INDEX IF NOT EXISTS idx_impersonation_status
    ON admin.impersonation_sessions(status);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE admin.impersonation_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS impersonation_sessions_policy ON admin.impersonation_sessions;
CREATE POLICY impersonation_sessions_policy ON admin.impersonation_sessions
    FOR ALL
    TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- GRANTS
-- =====================================================
GRANT USAGE ON SCHEMA admin TO authenticated, service_role, anon;
GRANT ALL ON ALL TABLES IN SCHEMA admin TO authenticated, service_role, anon;
