-- =====================================================
-- Migration: Create Meta Ads Lead Forms Tables (in core schema)
-- Date: 2026-07-17
-- Description: Creates tables for Meta Ads integration in core schema.
--   - core.meta_ads_forms         : User-selected lead forms with routing config
--   - core.meta_ads_field_mappings: Field mapping rules per form
--   - core.meta_ads_sync_logs     : Audit trail for webhook events
--
-- Note: OAuth tokens stored in core.integration_connections (provider = 'meta_ads')
--       Connected Facebook Pages stored in core.integration_accounts (one per page)
-- =====================================================

-- =====================================================
-- 1. meta_ads_forms
-- Stores user-selected lead forms for each connected Facebook Page.
-- Linked to a specific page via account_id (integration_accounts row).
-- =====================================================

CREATE TABLE IF NOT EXISTS core.meta_ads_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES core.integration_connections(id) ON DELETE CASCADE,
    account_id UUID REFERENCES core.integration_accounts(id) ON DELETE CASCADE,

    -- Meta identifiers
    business_id TEXT,
    business_name TEXT,
    page_id TEXT NOT NULL,
    page_name TEXT,
    form_id TEXT NOT NULL,
    form_name TEXT NOT NULL,

    -- Lead routing configuration
    default_pipeline_id UUID,
    default_stage_id UUID,
    default_owner_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    default_source_id UUID,
    tags TEXT[] NOT NULL DEFAULT '{}',

    -- Sync control
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_meta_ads_form_per_workspace UNIQUE (workspace_id, form_id)
);

CREATE INDEX IF NOT EXISTS idx_meta_ads_forms_workspace ON core.meta_ads_forms(workspace_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_forms_connection ON core.meta_ads_forms(connection_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_forms_page ON core.meta_ads_forms(workspace_id, page_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_forms_active ON core.meta_ads_forms(workspace_id) WHERE is_active = TRUE;

ALTER TABLE core.meta_ads_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY meta_ads_forms_policy ON core.meta_ads_forms FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON core.meta_ads_forms TO authenticated, service_role, anon;

-- =====================================================
-- 2. meta_ads_field_mappings
-- Maps Meta lead form field names to Leadgaze CRM field identifiers.
-- =====================================================

CREATE TABLE IF NOT EXISTS core.meta_ads_field_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    form_id UUID NOT NULL REFERENCES core.meta_ads_forms(id) ON DELETE CASCADE,

    -- Meta field name (e.g. full_name, email, phone_number, company_name)
    meta_field TEXT NOT NULL,

    -- Leadgaze target field identifier (e.g. 'first_name', 'email', 'phone_number')
    leadgaze_field TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_meta_ads_field_mapping UNIQUE (form_id, meta_field)
);

CREATE INDEX IF NOT EXISTS idx_meta_ads_field_mappings_form ON core.meta_ads_field_mappings(form_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_field_mappings_workspace ON core.meta_ads_field_mappings(workspace_id);

ALTER TABLE core.meta_ads_field_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY meta_ads_field_mappings_policy ON core.meta_ads_field_mappings FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON core.meta_ads_field_mappings TO authenticated, service_role, anon;

-- =====================================================
-- 3. meta_ads_sync_logs
-- Audit trail for every incoming Meta webhook lead event.
-- =====================================================

CREATE TABLE IF NOT EXISTS core.meta_ads_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

    -- Meta identifiers from the webhook payload
    page_id TEXT NOT NULL,
    form_id TEXT NOT NULL,
    leadgen_id TEXT NOT NULL,

    -- Outcome: success, duplicate, failed, invalid
    status TEXT NOT NULL,
    error_message TEXT,

    -- Raw webhook payload for debugging
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Reference to the CRM lead created (nullable; null on failure or duplicate)
    crm_lead_id UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meta_ads_sync_logs_workspace ON core.meta_ads_sync_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_sync_logs_leadgen ON core.meta_ads_sync_logs(workspace_id, leadgen_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_sync_logs_created ON core.meta_ads_sync_logs(workspace_id, created_at DESC);

ALTER TABLE core.meta_ads_sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY meta_ads_sync_logs_policy ON core.meta_ads_sync_logs FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON core.meta_ads_sync_logs TO authenticated, service_role, anon;

-- =====================================================
-- Triggers: keep updated_at current
-- =====================================================

DROP TRIGGER IF EXISTS set_meta_ads_forms_updated_at ON core.meta_ads_forms;
CREATE TRIGGER set_meta_ads_forms_updated_at
    BEFORE UPDATE ON core.meta_ads_forms
    FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

DROP TRIGGER IF EXISTS set_meta_ads_field_mappings_updated_at ON core.meta_ads_field_mappings;
CREATE TRIGGER set_meta_ads_field_mappings_updated_at
    BEFORE UPDATE ON core.meta_ads_field_mappings
    FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
