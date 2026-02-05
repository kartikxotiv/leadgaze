BEGIN;
-- Create Enum for Email Providers
CREATE TYPE email_provider AS ENUM ('google', 'outlook', 'smtp');
-- ===============================
-- 1. EMAIL TEMPLATES (SendGrid-like)
-- ===============================
CREATE TABLE workspace_email_templates (
    id BIGSERIAL PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    subject VARCHAR(512) NOT NULL,
    html_body TEXT NOT NULL,
    text_body TEXT,
    variables JSONB,
    -- ["name", "reset_link"]
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES accounts(id) ON DELETE
    SET NULL,
        updated_by UUID REFERENCES accounts(id) ON DELETE
    SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (workspace_id, slug)
);
CREATE INDEX idx_workspace_email_templates_slug ON workspace_email_templates(slug);
CREATE INDEX idx_workspace_email_templates_workspace_id ON workspace_email_templates(workspace_id);
-- ===============================
-- 2. EMAILS (Inbound + Outbound)
-- ===============================
CREATE TABLE emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    gmail_message_id VARCHAR(255) UNIQUE NOT NULL,
    direction VARCHAR(10) CHECK (direction IN ('inbound', 'outbound')),
    from_email VARCHAR(255),
    to_emails TEXT,
    cc_emails TEXT,
    bcc_emails TEXT,
    subject VARCHAR(512),
    html_body TEXT,
    text_body TEXT,
    snippet TEXT,
    -- Polymorphic Relationship
    entity_type VARCHAR(50),
    entity_id UUID,
    created_by UUID REFERENCES accounts(id) ON DELETE
    SET NULL,
        received_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_emails_direction ON emails(direction);
CREATE INDEX idx_emails_from_email ON emails(from_email);
CREATE INDEX idx_emails_workspace_id ON emails(workspace_id);
CREATE INDEX idx_emails_entity ON emails(entity_type, entity_id);
-- ===============================
-- 3. EMAIL SEND LOGS (Events)
-- ===============================
CREATE TABLE email_sends (
    id BIGSERIAL PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    template_id BIGINT REFERENCES workspace_email_templates(id) ON DELETE
    SET NULL,
        to_email VARCHAR(255) NOT NULL,
        from_email VARCHAR(255) NOT NULL,
        subject VARCHAR(512),
        rendered_html TEXT,
        rendered_text TEXT,
        provider_message_id VARCHAR(255),
        thread_id VARCHAR(255),
        status VARCHAR(50) CHECK (status IN ('queued', 'sent', 'failed')),
        error TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_email_sends_template_id ON email_sends(template_id);
CREATE INDEX idx_email_sends_status ON email_sends(status);
CREATE INDEX idx_email_sends_workspace_id ON email_sends(workspace_id);
-- ===============================
-- 4. EMAIL ACCOUNTS (Unified SMTP + OAuth)
-- ===============================
CREATE TABLE email_accounts (
    id BIGSERIAL PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255),
    provider email_provider NOT NULL DEFAULT 'google',
    is_active BOOLEAN DEFAULT TRUE,
    -- OAuth Fields
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP,
    -- SMTP Fields
    host VARCHAR(255),
    port INTEGER,
    secure BOOLEAN DEFAULT FALSE,
    username VARCHAR(255),
    password TEXT,
    -- Encrypt in app layer
    created_by UUID REFERENCES accounts(id) ON DELETE
    SET NULL,
        updated_by UUID REFERENCES accounts(id) ON DELETE
    SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (workspace_id, email)
);
CREATE INDEX idx_email_accounts_workspace_id ON email_accounts(workspace_id);
-- ===============================
-- 5. UPDATED_AT TRIGGERS
-- ===============================
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ language 'plpgsql';
CREATE TRIGGER trg_workspace_email_templates_updated_at BEFORE
UPDATE ON workspace_email_templates FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER trg_email_accounts_updated_at BEFORE
UPDATE ON email_accounts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
COMMIT;