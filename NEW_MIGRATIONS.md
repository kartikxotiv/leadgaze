BEGIN;

-- ===============================
-- 1. EMAIL TEMPLATES (SendGrid-like)
-- ===============================
CREATE TABLE email_templates (
id BIGSERIAL PRIMARY KEY,
workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
name VARCHAR(255) NOT NULL,
slug VARCHAR(255) NOT NULL,
subject VARCHAR(512) NOT NULL,
html_body TEXT NOT NULL,
text_body TEXT,
variables JSONB, -- ["name", "reset_link"]
is_active BOOLEAN DEFAULT TRUE,
created_by UUID REFERENCES accounts(id) ON DELETE SET NULL,
updated_by UUID REFERENCES accounts(id) ON DELETE SET NULL,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
UNIQUE (workspace_id, slug)
);

CREATE INDEX idx_email_templates_slug ON email_templates(slug);
CREATE INDEX idx_email_templates_workspace_id ON email_templates(workspace_id);

-- ===============================
-- 2. EMAIL THREADS (Conversation)
-- ===============================
CREATE TABLE email_threads (
id VARCHAR(255) PRIMARY KEY, -- Gmail threadId
workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
subject VARCHAR(512),
last_message_at TIMESTAMP,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_threads_workspace_id ON email_threads(workspace_id);

-- ===============================
-- 3. EMAILS (Inbound + Outbound)
-- ===============================
CREATE TABLE emails (
id BIGSERIAL PRIMARY KEY,
workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
gmail_message_id VARCHAR(255) UNIQUE NOT NULL,
thread_id VARCHAR(255) REFERENCES email_threads(id) ON DELETE CASCADE,
direction VARCHAR(10) CHECK (direction IN ('inbound', 'outbound')),
from_email VARCHAR(255),
to_emails TEXT,
cc_emails TEXT,
bcc_emails TEXT,
subject VARCHAR(512),
html_body TEXT,
text_body TEXT,
snippet TEXT,
received_at TIMESTAMP,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_emails_thread_id ON emails(thread_id);
CREATE INDEX idx_emails_direction ON emails(direction);
CREATE INDEX idx_emails_from_email ON emails(from_email);
CREATE INDEX idx_emails_workspace_id ON emails(workspace_id);

-- ===============================
-- 4. EMAIL SEND LOGS (SendGrid Events)
-- ===============================
CREATE TABLE email_sends (
id BIGSERIAL PRIMARY KEY,
workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
template_id BIGINT REFERENCES email_templates(id) ON DELETE SET NULL,
to_email VARCHAR(255) NOT NULL,
from_email VARCHAR(255) NOT NULL,
subject VARCHAR(512),
rendered_html TEXT,
rendered_text TEXT,
provider_message_id VARCHAR(255),
thread_id VARCHAR(255),
status VARCHAR(50) CHECK (
status IN ('queued', 'sent', 'failed')
),
error TEXT,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_sends_template_id ON email_sends(template_id);
CREATE INDEX idx_email_sends_status ON email_sends(status);
CREATE INDEX idx_email_sends_thread_id ON email_sends(thread_id);
CREATE INDEX idx_email_sends_workspace_id ON email_sends(workspace_id);

-- ===============================
-- 5. OPTIONAL: OAUTH TOKENS (Multi-account)
-- ===============================
CREATE TABLE email_oauth_accounts (
id BIGSERIAL PRIMARY KEY,
workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
email VARCHAR(255) NOT NULL,
provider VARCHAR(50) DEFAULT 'google',
access_token TEXT,
refresh_token TEXT,
expires_at TIMESTAMP,
created_by UUID REFERENCES accounts(id) ON DELETE SET NULL,
updated_by UUID REFERENCES accounts(id) ON DELETE SET NULL,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
UNIQUE (workspace_id, email)
);

CREATE INDEX idx_email_oauth_accounts_workspace_id ON email_oauth_accounts(workspace_id);

-- ===============================
-- 6. UPDATED_AT TRIGGERS
-- ===============================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;

$$
language 'plpgsql';

CREATE TRIGGER trg_email_templates_updated_at
BEFORE UPDATE ON email_templates
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER trg_oauth_accounts_updated_at
BEFORE UPDATE ON email_oauth_accounts
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

COMMIT;

CREATE TABLE email_smtp_accounts (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  host VARCHAR(255) NOT NULL,
  port INTEGER NOT NULL,
  secure BOOLEAN DEFAULT FALSE,
  username VARCHAR(255),
  password TEXT, -- encrypt in app layer
  from_name VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_smtp_accounts_workspace_id ON email_smtp_accounts(workspace_id);
$$
