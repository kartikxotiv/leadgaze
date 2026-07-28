-- =====================================================
-- Migration: Create WhatsApp Business Integration Tables
-- Date: 2026-07-20
-- Description: All tables prefixed with whatsapp_ to avoid
--              collision with future generic inbox tables.
--              Uses existing core.integration_connections for
--              auth tokens and core.integration_accounts for
--              phone number metadata.
-- =====================================================

-- =====================================================
-- 1. whatsapp_settings — per-workspace configuration
-- =====================================================
CREATE TABLE IF NOT EXISTS core.whatsapp_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

    -- Lead creation mode: automatic | manual | hybrid (default)
    lead_creation_mode TEXT NOT NULL DEFAULT 'hybrid'
        CHECK (lead_creation_mode IN ('automatic', 'manual', 'hybrid')),

    -- Hybrid mode: keywords that trigger lead creation
    lead_keywords TEXT[] NOT NULL DEFAULT ARRAY[
        'pricing', 'quote', 'demo', 'interested', 'cost',
        'buy', 'purchase', 'subscription', 'plan', 'sales',
        'consultation', 'meeting', 'proposal'
    ],

    -- Hybrid mode: message count threshold before auto-creating lead
    lead_message_threshold INTEGER NOT NULL DEFAULT 3,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (workspace_id)
);

-- =====================================================
-- 2. whatsapp_conversations — one per unique customer
-- =====================================================
CREATE TABLE IF NOT EXISTS core.whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

    -- WhatsApp phone number account used (integration_accounts row)
    account_id UUID REFERENCES core.integration_accounts(id) ON DELETE SET NULL,

    -- The customer's WhatsApp phone number (e.g. +919876543210)
    customer_phone TEXT NOT NULL,
    customer_name TEXT,

    -- CRM links (nullable — set when lead/contact is matched or created)
    lead_id UUID,       -- references core CRM leads table
    contact_id UUID,    -- references core CRM contacts table

    -- Conversation state
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'pending', 'resolved', 'closed')),

    -- The first message body (preview)
    first_message TEXT,

    -- WhatsApp 24-hour customer service window: last inbound message time
    last_customer_message_at TIMESTAMPTZ,

    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    message_count INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (workspace_id, account_id, customer_phone)
);

-- =====================================================
-- 3. whatsapp_messages — all inbound/outbound messages
-- =====================================================
CREATE TABLE IF NOT EXISTS core.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES core.whatsapp_conversations(id) ON DELETE CASCADE,

    -- Meta's unique message ID (for deduplication)
    meta_message_id TEXT UNIQUE,

    direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),

    message_type TEXT NOT NULL DEFAULT 'text'
        CHECK (message_type IN ('text', 'image', 'video', 'audio', 'document',
                                'template', 'interactive', 'sticker', 'location',
                                'contact', 'unsupported')),

    -- Text body (null for media-only messages)
    body TEXT,

    -- Media
    media_url TEXT,
    media_type TEXT,    -- mime type e.g. image/jpeg
    media_size BIGINT,
    meta_media_id TEXT, -- Meta's media object ID for re-download

    -- Template tracking
    template_name TEXT,
    template_language TEXT,

    -- Delivery status
    status TEXT NOT NULL DEFAULT 'sent'
        CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    error_message TEXT,

    -- Who sent it (null = customer / incoming)
    sent_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 4. whatsapp_assignments — assignment history
-- =====================================================
CREATE TABLE IF NOT EXISTS core.whatsapp_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES core.whatsapp_conversations(id) ON DELETE CASCADE,

    assigned_to UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    unassigned_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 5. whatsapp_notes — internal private notes per conversation
-- =====================================================
CREATE TABLE IF NOT EXISTS core.whatsapp_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES core.whatsapp_conversations(id) ON DELETE CASCADE,

    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    body TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 6. whatsapp_saved_replies — reusable reply snippets
-- =====================================================
CREATE TABLE IF NOT EXISTS core.whatsapp_saved_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

    title TEXT NOT NULL,
    body TEXT NOT NULL,

    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 7. whatsapp_templates — synced Meta message templates
-- =====================================================
CREATE TABLE IF NOT EXISTS core.whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    account_id UUID REFERENCES core.integration_accounts(id) ON DELETE CASCADE,

    -- Meta template identifiers
    meta_template_id TEXT,
    template_name TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en_US',
    category TEXT NOT NULL DEFAULT 'MARKETING'
        CHECK (category IN ('MARKETING', 'UTILITY', 'AUTHENTICATION')),

    -- Full template payload from Meta API (header, body, footer, buttons)
    template_payload JSONB NOT NULL DEFAULT '{}'::jsonb,

    status TEXT NOT NULL DEFAULT 'APPROVED'
        CHECK (status IN ('APPROVED', 'PENDING', 'REJECTED', 'PAUSED', 'DISABLED')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_workspace ON core.whatsapp_conversations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_status ON core.whatsapp_conversations(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone ON core.whatsapp_conversations(workspace_id, customer_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_account ON core.whatsapp_conversations(account_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation ON core.whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_meta_id ON core.whatsapp_messages(meta_message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_assignments_conversation ON core.whatsapp_assignments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_notes_conversation ON core.whatsapp_notes(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_saved_replies_workspace ON core.whatsapp_saved_replies(workspace_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_workspace ON core.whatsapp_templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_settings_workspace ON core.whatsapp_settings(workspace_id);

-- =====================================================
-- TRIGGERS
-- =====================================================
DROP TRIGGER IF EXISTS set_whatsapp_settings_updated_at ON core.whatsapp_settings;
CREATE TRIGGER set_whatsapp_settings_updated_at BEFORE UPDATE ON core.whatsapp_settings
    FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

DROP TRIGGER IF EXISTS set_whatsapp_conversations_updated_at ON core.whatsapp_conversations;
CREATE TRIGGER set_whatsapp_conversations_updated_at BEFORE UPDATE ON core.whatsapp_conversations
    FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

DROP TRIGGER IF EXISTS set_whatsapp_messages_updated_at ON core.whatsapp_messages;
CREATE TRIGGER set_whatsapp_messages_updated_at BEFORE UPDATE ON core.whatsapp_messages
    FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

DROP TRIGGER IF EXISTS set_whatsapp_notes_updated_at ON core.whatsapp_notes;
CREATE TRIGGER set_whatsapp_notes_updated_at BEFORE UPDATE ON core.whatsapp_notes
    FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

DROP TRIGGER IF EXISTS set_whatsapp_saved_replies_updated_at ON core.whatsapp_saved_replies;
CREATE TRIGGER set_whatsapp_saved_replies_updated_at BEFORE UPDATE ON core.whatsapp_saved_replies
    FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

DROP TRIGGER IF EXISTS set_whatsapp_templates_updated_at ON core.whatsapp_templates;
CREATE TRIGGER set_whatsapp_templates_updated_at BEFORE UPDATE ON core.whatsapp_templates
    FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE core.whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.whatsapp_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.whatsapp_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.whatsapp_saved_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.whatsapp_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS whatsapp_settings_policy ON core.whatsapp_settings;
CREATE POLICY whatsapp_settings_policy ON core.whatsapp_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS whatsapp_conversations_policy ON core.whatsapp_conversations;
CREATE POLICY whatsapp_conversations_policy ON core.whatsapp_conversations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS whatsapp_messages_policy ON core.whatsapp_messages;
CREATE POLICY whatsapp_messages_policy ON core.whatsapp_messages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS whatsapp_assignments_policy ON core.whatsapp_assignments;
CREATE POLICY whatsapp_assignments_policy ON core.whatsapp_assignments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS whatsapp_notes_policy ON core.whatsapp_notes;
CREATE POLICY whatsapp_notes_policy ON core.whatsapp_notes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS whatsapp_saved_replies_policy ON core.whatsapp_saved_replies;
CREATE POLICY whatsapp_saved_replies_policy ON core.whatsapp_saved_replies FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS whatsapp_templates_policy ON core.whatsapp_templates;
CREATE POLICY whatsapp_templates_policy ON core.whatsapp_templates FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- GRANTS
-- =====================================================
GRANT ALL ON ALL TABLES IN SCHEMA core TO authenticated, service_role, anon;
