-- =====================================================
-- Migration: Create Zapier Integration Tables
-- Date: 2026-07-15
-- Description: Creates schemas for Zapier credentials and log tracking.
-- =====================================================

CREATE TABLE IF NOT EXISTS core.zapier_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, disabled
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_zapier_workspace UNIQUE (workspace_id)
);

CREATE TABLE IF NOT EXISTS core.zapier_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    api_key VARCHAR(255) NOT NULL UNIQUE,
    masked_key VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, inactive
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.zapier_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    request_type VARCHAR(100) NOT NULL, -- e.g. 'Create Lead', 'Search Contact', etc.
    status VARCHAR(50) NOT NULL, -- Success, Failed, Unauthorized, Rate Limited
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE core.zapier_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.zapier_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.zapier_logs ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies allowing full read/write for now
CREATE POLICY zapier_integrations_policy ON core.zapier_integrations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY zapier_api_keys_policy ON core.zapier_api_keys FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY zapier_logs_policy ON core.zapier_logs FOR ALL USING (true) WITH CHECK (true);

-- Grant privileges
GRANT ALL ON ALL TABLES IN SCHEMA core TO authenticated, service_role, anon;
