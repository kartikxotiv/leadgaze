-- =====================================================
-- Migration: Create Google Ads Lead Forms Tables (in core schema)
-- Date: 2026-07-16
-- Description: Creates tables for Google Ads integration in core schema.
--   - core.google_ads_forms      : User-selected lead forms with routing config
--   - core.google_ads_field_mappings : Field mapping rules per form
--   - core.google_ads_sync_logs  : Audit trail for webhook events
--
-- Note: OAuth tokens are stored in core.integration_connections (provider = 'google_ads')
--       Customer accounts are stored in core.integration_accounts.
-- =====================================================

-- =====================================================
-- 1. google_ads_forms
-- Stores the lead forms the user selected for each Ad Account/Campaign,
-- together with the lead routing configuration (pipeline, stage, owner).
-- =====================================================

CREATE TABLE IF NOT EXISTS core.google_ads_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES core.integration_connections(id) ON DELETE CASCADE,
    account_id UUID REFERENCES core.integration_accounts(id) ON DELETE CASCADE,

    -- Google Ads identifiers
    customer_id TEXT NOT NULL,
    campaign_id TEXT,
    campaign_name TEXT,
    form_id TEXT NOT NULL,
    form_name TEXT NOT NULL,

    -- Lead routing configuration
    default_pipeline_id UUID,
    default_stage_id UUID,
    default_owner_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    default_source_id UUID,          -- Resolved lead source for attribution
    tags TEXT[] NOT NULL DEFAULT '{}',

    -- Sync control
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Each form can only be configured once per workspace
    CONSTRAINT unique_google_ads_form_per_workspace UNIQUE (workspace_id, form_id)
);

CREATE INDEX IF NOT EXISTS idx_google_ads_forms_workspace ON core.google_ads_forms(workspace_id);
CREATE INDEX IF NOT EXISTS idx_google_ads_forms_connection ON core.google_ads_forms(connection_id);
CREATE INDEX IF NOT EXISTS idx_google_ads_forms_active ON core.google_ads_forms(workspace_id) WHERE is_active = TRUE;

ALTER TABLE core.google_ads_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY google_ads_forms_policy ON core.google_ads_forms FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON core.google_ads_forms TO authenticated, service_role, anon;

-- =====================================================
-- 2. google_ads_field_mappings
-- Maps Google Ads lead form field names to Leadgaze CRM field identifiers.
-- =====================================================

CREATE TABLE IF NOT EXISTS core.google_ads_field_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    form_id UUID NOT NULL REFERENCES core.google_ads_forms(id) ON DELETE CASCADE,

    -- Google field name (e.g. FULL_NAME, EMAIL, PHONE_NUMBER, COMPANY_NAME)
    google_field TEXT NOT NULL,

    -- Leadgaze target field identifier (e.g. 'first_name', 'email', 'phone_number')
    -- References entity_fields(id) for custom fields, or a built-in field name
    leadgaze_field TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_google_ads_field_mapping UNIQUE (form_id, google_field)
);

CREATE INDEX IF NOT EXISTS idx_google_ads_field_mappings_form ON core.google_ads_field_mappings(form_id);
CREATE INDEX IF NOT EXISTS idx_google_ads_field_mappings_workspace ON core.google_ads_field_mappings(workspace_id);

ALTER TABLE core.google_ads_field_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY google_ads_field_mappings_policy ON core.google_ads_field_mappings FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON core.google_ads_field_mappings TO authenticated, service_role, anon;

-- =====================================================
-- 3. google_ads_sync_logs
-- Audit trail for every incoming Google Ads webhook event.
-- =====================================================

CREATE TABLE IF NOT EXISTS core.google_ads_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

    -- Google identifiers from the webhook payload
    customer_id TEXT NOT NULL,
    form_id TEXT NOT NULL,
    lead_id TEXT NOT NULL,

    -- Outcome: success, duplicate, failed, invalid
    status TEXT NOT NULL,
    error_message TEXT,

    -- The full raw payload for debugging
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Reference to the CRM lead created (nullable; null on failure or duplicate)
    crm_lead_id UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_google_ads_sync_logs_workspace ON core.google_ads_sync_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_google_ads_sync_logs_lead ON core.google_ads_sync_logs(workspace_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_google_ads_sync_logs_created ON core.google_ads_sync_logs(workspace_id, created_at DESC);

ALTER TABLE core.google_ads_sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY google_ads_sync_logs_policy ON core.google_ads_sync_logs FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON core.google_ads_sync_logs TO authenticated, service_role, anon;

-- =====================================================
-- Triggers: keep updated_at current
-- =====================================================

DROP TRIGGER IF EXISTS set_google_ads_forms_updated_at ON core.google_ads_forms;
CREATE TRIGGER set_google_ads_forms_updated_at
    BEFORE UPDATE ON core.google_ads_forms
    FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

DROP TRIGGER IF EXISTS set_google_ads_field_mappings_updated_at ON core.google_ads_field_mappings;
CREATE TRIGGER set_google_ads_field_mappings_updated_at
    BEFORE UPDATE ON core.google_ads_field_mappings
    FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
