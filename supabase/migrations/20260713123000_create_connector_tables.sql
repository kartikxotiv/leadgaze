-- =====================================================
-- Migration: Create Connector Tables
-- Date: 2026-07-13
-- Description: Creates the core tables for the Website/Service Cloud Connectors.
-- =====================================================

-- =====================================================
-- CONNECTORS & FORMS TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS core.connectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, active, disabled, error
    type VARCHAR(50) NOT NULL DEFAULT 'website', -- website, google_ads, meta_ads, webhook, whatsapp, etc.
    
    -- Robust design supporting different targets (CRM Leads, Service Cloud Tickets)
    destination_module VARCHAR(100) NOT NULL, -- 'crm', 'service_cloud', etc.
    destination_entity VARCHAR(100) NOT NULL, -- 'lead', 'ticket', etc.
    destination_config JSONB NOT NULL DEFAULT '{}'::jsonb, -- dynamic configuration (e.g. status, category, redirect URLs)

    default_owner_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    assignment_mode VARCHAR(50) NOT NULL DEFAULT 'fixed', -- fixed, round_robin, conditional
    assignment_rules JSONB NOT NULL DEFAULT '[]'::jsonb,

    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.connector_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connector_id UUID NOT NULL REFERENCES core.connectors(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    success_message TEXT,
    redirect_url TEXT,
    spam_protection_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.connector_form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES core.connector_forms(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL, -- e.g. 'name', 'email', 'custom_fields.budget'
    label VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL, -- text, number, select, radio, checkbox, textarea
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    options JSONB DEFAULT '[]'::jsonb, -- option items for choices
    placeholder VARCHAR(255),
    default_value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.connector_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connector_id UUID NOT NULL REFERENCES core.connectors(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    public_key VARCHAR(255) NOT NULL UNIQUE,
    hashed_secret_key VARCHAR(255) NOT NULL,
    masked_secret_key VARCHAR(50) NOT NULL, -- e.g. sk_live_...abcd
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.connector_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connector_id UUID NOT NULL REFERENCES core.connectors(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    source VARCHAR(50) NOT NULL, -- 'embedded_form', 'api'
    raw_payload JSONB NOT NULL,
    normalized_payload JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'received', -- received, processing, success, duplicate, failed
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.connector_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES core.connector_events(id) ON DELETE SET NULL,
    connector_id UUID NOT NULL REFERENCES core.connectors(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL, -- received, processing, success, duplicate, failed
    processing_result JSONB, -- stores output identifiers e.g. { "lead_id": "uuid" } or { "ticket_id": "uuid" }
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_core_connectors_workspace ON core.connectors(workspace_id);
CREATE INDEX IF NOT EXISTS idx_core_connector_forms_connector ON core.connector_forms(connector_id);
CREATE INDEX IF NOT EXISTS idx_core_connector_form_fields_form ON core.connector_form_fields(form_id);
CREATE INDEX IF NOT EXISTS idx_core_connector_api_keys_pub ON core.connector_api_keys(public_key);
CREATE INDEX IF NOT EXISTS idx_core_connector_api_keys_conn ON core.connector_api_keys(connector_id);
CREATE INDEX IF NOT EXISTS idx_core_connector_events_conn ON core.connector_events(connector_id);
CREATE INDEX IF NOT EXISTS idx_core_connector_logs_event ON core.connector_logs(event_id);

-- =====================================================
-- TRIGGERS & RLS & GRANTS
-- =====================================================

DROP TRIGGER IF EXISTS set_core_connectors_updated_at ON core.connectors;
CREATE TRIGGER set_core_connectors_updated_at BEFORE UPDATE ON core.connectors FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

DROP TRIGGER IF EXISTS set_core_connector_forms_updated_at ON core.connector_forms;
CREATE TRIGGER set_core_connector_forms_updated_at BEFORE UPDATE ON core.connector_forms FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

DROP TRIGGER IF EXISTS set_core_connector_form_fields_updated_at ON core.connector_form_fields;
CREATE TRIGGER set_core_connector_form_fields_updated_at BEFORE UPDATE ON core.connector_form_fields FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

DROP TRIGGER IF EXISTS set_core_connector_api_keys_updated_at ON core.connector_api_keys;
CREATE TRIGGER set_core_connector_api_keys_updated_at BEFORE UPDATE ON core.connector_api_keys FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

DROP TRIGGER IF EXISTS set_core_connector_events_updated_at ON core.connector_events;
CREATE TRIGGER set_core_connector_events_updated_at BEFORE UPDATE ON core.connector_events FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

ALTER TABLE core.connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.connector_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.connector_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.connector_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.connector_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.connector_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS connectors_policy ON core.connectors;
CREATE POLICY connectors_policy ON core.connectors FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS connector_forms_policy ON core.connector_forms;
CREATE POLICY connector_forms_policy ON core.connector_forms FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS connector_form_fields_policy ON core.connector_form_fields;
CREATE POLICY connector_form_fields_policy ON core.connector_form_fields FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS connector_api_keys_policy ON core.connector_api_keys;
CREATE POLICY connector_api_keys_policy ON core.connector_api_keys FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS connector_events_policy ON core.connector_events;
CREATE POLICY connector_events_policy ON core.connector_events FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS connector_logs_policy ON core.connector_logs;
CREATE POLICY connector_logs_policy ON core.connector_logs FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON ALL TABLES IN SCHEMA core TO authenticated, service_role, anon;


-- Add theme and editable heading/subheading to connector forms
ALTER TABLE core.connector_forms 
ADD COLUMN IF NOT EXISTS button_color VARCHAR(50) DEFAULT '#4f46e5',
ADD COLUMN IF NOT EXISTS heading VARCHAR(255) DEFAULT 'Contact Us',
ADD COLUMN IF NOT EXISTS subheading TEXT DEFAULT 'Please fill out the form below to get in touch.';
