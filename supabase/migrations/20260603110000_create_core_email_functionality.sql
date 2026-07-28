/*
 * -------------------------------------------------------
 * Migration: Create Core Email Functionality
 * Date: 2026-06-03
 * Description: Moves reusable email infrastructure into the core schema so
 *              CRM, Service Cloud, Fundraising, HRMS, Inventory, and future
 *              modules can share one email capability.
 *
 *              Existing public email tables are intentionally not dropped or
 *              modified. CRM can continue using them until it is migrated to
 *              core.
 * -------------------------------------------------------
 */

CREATE SCHEMA IF NOT EXISTS core;

GRANT USAGE ON SCHEMA core TO authenticated, service_role, anon;

CREATE OR REPLACE FUNCTION core.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 1. Core Email Types
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'email_provider_enum'
      AND n.nspname = 'core'
  ) THEN
    CREATE TYPE core.email_provider_enum AS ENUM (
      'google',
      'outlook',
      'smtp',
      'imap'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'email_account_access_scope_enum'
      AND n.nspname = 'core'
  ) THEN
    CREATE TYPE core.email_account_access_scope_enum AS ENUM (
      'private',
      'workspace'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'email_direction_enum'
      AND n.nspname = 'core'
  ) THEN
    CREATE TYPE core.email_direction_enum AS ENUM (
      'inbound',
      'outbound',
      'internal',
      'system'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'email_status_enum'
      AND n.nspname = 'core'
  ) THEN
    CREATE TYPE core.email_status_enum AS ENUM (
      'draft',
      'scheduled',
      'queued',
      'sent',
      'failed',
      'received'
    );
  END IF;
END $$;

-- =====================================================
-- 2. Email Accounts
-- =====================================================

CREATE TABLE IF NOT EXISTS core.email_accounts (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  from_name VARCHAR(255),
  provider core.email_provider_enum NOT NULL DEFAULT 'google',
  owner_user_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  access_scope core.email_account_access_scope_enum NOT NULL DEFAULT 'workspace',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  inbound_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  outbound_enabled BOOLEAN NOT NULL DEFAULT TRUE,

  -- OAuth provider fields. Store encrypted values at the application layer.
  provider_account_id VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,

  -- SMTP fields.
  smtp_host VARCHAR(255),
  smtp_port INTEGER,
  smtp_secure BOOLEAN NOT NULL DEFAULT FALSE,
  smtp_username VARCHAR(255),
  smtp_password TEXT,

  -- IMAP fields.
  imap_host VARCHAR(255),
  imap_port INTEGER,
  imap_secure BOOLEAN NOT NULL DEFAULT TRUE,
  imap_username VARCHAR(255),
  imap_password TEXT,

  -- Sync state.
  last_synced_at TIMESTAMPTZ,
  history_id VARCHAR(255),
  sync_cursor TEXT,
  last_error TEXT,

  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT core_email_accounts_workspace_email_unique UNIQUE (workspace_id, email),
  CONSTRAINT core_email_accounts_id_workspace_unique UNIQUE (id, workspace_id)
);

COMMENT ON TABLE core.email_accounts IS 'Reusable connected email accounts for sending, receiving, and syncing emails across Leadgaze modules.';

CREATE INDEX IF NOT EXISTS idx_core_email_accounts_workspace ON core.email_accounts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_core_email_accounts_owner ON core.email_accounts(owner_user_id) WHERE owner_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_email_accounts_sync ON core.email_accounts(workspace_id, is_active, is_sync_enabled);
CREATE INDEX IF NOT EXISTS idx_core_email_accounts_provider ON core.email_accounts(workspace_id, provider);

CREATE TABLE IF NOT EXISTS core.email_account_access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_account_id BIGINT NOT NULL,
  workspace_id UUID NOT NULL,
  grantee_user_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  can_send BOOLEAN NOT NULL DEFAULT TRUE,
  can_sync BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT core_email_account_access_grants_account_workspace_fkey
    FOREIGN KEY (email_account_id, workspace_id)
    REFERENCES core.email_accounts(id, workspace_id)
    ON DELETE CASCADE,
  CONSTRAINT core_email_account_access_grants_unique
    UNIQUE (email_account_id, grantee_user_id)
);

COMMENT ON TABLE core.email_account_access_grants IS 'Optional per-user grants for private core email accounts.';

CREATE INDEX IF NOT EXISTS idx_core_email_account_access_grants_workspace_user
  ON core.email_account_access_grants(workspace_id, grantee_user_id);

-- =====================================================
-- 3. Email Templates and Variables
-- =====================================================

CREATE TABLE IF NOT EXISTS core.email_templates (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  subject VARCHAR(512) NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT core_email_templates_workspace_slug_unique UNIQUE (workspace_id, slug)
);

COMMENT ON TABLE core.email_templates IS 'Reusable workspace-scoped email templates for all modules.';

CREATE INDEX IF NOT EXISTS idx_core_email_templates_workspace ON core.email_templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_core_email_templates_slug ON core.email_templates(slug);

CREATE TABLE IF NOT EXISTS core.email_variables (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  key VARCHAR(255) NOT NULL,
  value TEXT NOT NULL,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT core_email_variables_workspace_key_unique UNIQUE (workspace_id, key)
);

COMMENT ON TABLE core.email_variables IS 'Workspace-scoped key/value variables for rendering core email templates.';

CREATE INDEX IF NOT EXISTS idx_core_email_variables_workspace ON core.email_variables(workspace_id);

-- =====================================================
-- 4. Core Emails and Module Relations
-- =====================================================

CREATE TABLE IF NOT EXISTS core.emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email_account_id BIGINT REFERENCES core.email_accounts(id) ON DELETE SET NULL,
  template_id BIGINT REFERENCES core.email_templates(id) ON DELETE SET NULL,
  thread_id UUID,
  thread_key TEXT,
  provider_message_id VARCHAR(255),
  gmail_message_id VARCHAR(255),
  internet_message_id TEXT,
  in_reply_to TEXT,
  email_references TEXT,
  direction TEXT NOT NULL DEFAULT 'outbound',
  from_email TEXT,
  from_name TEXT,
  to_email TEXT,
  to_emails JSONB NOT NULL DEFAULT '[]'::jsonb,
  cc TEXT,
  cc_emails JSONB NOT NULL DEFAULT '[]'::jsonb,
  bcc TEXT,
  bcc_emails JSONB NOT NULL DEFAULT '[]'::jsonb,
  subject TEXT,
  body TEXT,
  html_body TEXT,
  text_body TEXT,
  snippet TEXT,
  raw_headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'sent',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE core.emails
  ADD COLUMN IF NOT EXISTS email_account_id BIGINT REFERENCES core.email_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS template_id BIGINT REFERENCES core.email_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS thread_key TEXT,
  ADD COLUMN IF NOT EXISTS provider_message_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS gmail_message_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS internet_message_id TEXT,
  ADD COLUMN IF NOT EXISTS in_reply_to TEXT,
  ADD COLUMN IF NOT EXISTS email_references TEXT,
  ADD COLUMN IF NOT EXISTS from_name TEXT,
  ADD COLUMN IF NOT EXISTS to_emails JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cc_emails JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS bcc_emails JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS html_body TEXT,
  ADD COLUMN IF NOT EXISTS text_body TEXT,
  ADD COLUMN IF NOT EXISTS snippet TEXT,
  ADD COLUMN IF NOT EXISTS raw_headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'core_emails_status_check'
  ) THEN
    ALTER TABLE core.emails
      ADD CONSTRAINT core_emails_status_check
      CHECK (status IN ('draft', 'scheduled', 'queued', 'sent', 'failed', 'received'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'core_emails_direction_check'
  ) THEN
    ALTER TABLE core.emails
      ADD CONSTRAINT core_emails_direction_check
      CHECK (direction IN ('inbound', 'outbound', 'internal', 'system'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_core_emails_provider_message_unique
  ON core.emails(workspace_id, provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_core_emails_gmail_message_unique
  ON core.emails(workspace_id, gmail_message_id)
  WHERE gmail_message_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_core_emails_internet_message_unique
  ON core.emails(workspace_id, internet_message_id)
  WHERE internet_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_core_emails_workspace ON core.emails(workspace_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_core_emails_account ON core.emails(email_account_id) WHERE email_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_emails_thread ON core.emails(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_emails_thread_key ON core.emails(workspace_id, thread_key) WHERE thread_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_emails_direction ON core.emails(workspace_id, direction);
CREATE INDEX IF NOT EXISTS idx_core_emails_status ON core.emails(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_core_emails_received_at ON core.emails(workspace_id, received_at DESC) WHERE received_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_emails_sent_at ON core.emails(workspace_id, sent_at DESC) WHERE sent_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS core.email_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email_id UUID NOT NULL REFERENCES core.emails(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  relation_type TEXT NOT NULL DEFAULT 'related',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT core_email_relations_unique UNIQUE (email_id, entity_type, entity_id)
);

ALTER TABLE core.email_relations
  ADD COLUMN IF NOT EXISTS relation_type TEXT NOT NULL DEFAULT 'related';

CREATE INDEX IF NOT EXISTS idx_core_email_relations_entity
  ON core.email_relations(workspace_id, entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_core_email_relations_email
  ON core.email_relations(email_id);

-- =====================================================
-- 5. Send Logs
-- =====================================================

CREATE TABLE IF NOT EXISTS core.email_sends (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email_id UUID REFERENCES core.emails(id) ON DELETE SET NULL,
  email_account_id BIGINT REFERENCES core.email_accounts(id) ON DELETE SET NULL,
  template_id BIGINT REFERENCES core.email_templates(id) ON DELETE SET NULL,
  to_email VARCHAR(255) NOT NULL,
  from_email VARCHAR(255) NOT NULL,
  subject VARCHAR(512),
  rendered_html TEXT,
  rendered_text TEXT,
  provider_message_id VARCHAR(255),
  thread_key TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  error TEXT,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT core_email_sends_status_check CHECK (status IN ('queued', 'sent', 'failed'))
);

COMMENT ON TABLE core.email_sends IS 'Provider send attempts and rendered payload history for core emails.';

CREATE INDEX IF NOT EXISTS idx_core_email_sends_workspace ON core.email_sends(workspace_id);
CREATE INDEX IF NOT EXISTS idx_core_email_sends_email ON core.email_sends(email_id) WHERE email_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_email_sends_status ON core.email_sends(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_core_email_sends_template ON core.email_sends(template_id) WHERE template_id IS NOT NULL;

-- =====================================================
-- 6. RLS, Policies, Triggers, Grants
-- =====================================================

DO $$
DECLARE
  v_table TEXT;
BEGIN
  FOR v_table IN
    SELECT unnest(ARRAY[
      'email_accounts',
      'email_account_access_grants',
      'email_templates',
      'email_variables',
      'emails',
      'email_relations',
      'email_sends'
    ]::TEXT[])
  LOOP
    EXECUTE format('ALTER TABLE core.%I ENABLE ROW LEVEL SECURITY', v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON core.%I', v_table || '_policy', v_table);
    EXECUTE format(
      'CREATE POLICY %I ON core.%I FOR ALL TO service_role, authenticated, anon USING (true) WITH CHECK (true)',
      v_table || '_policy',
      v_table
    );
    EXECUTE format('GRANT ALL ON core.%I TO service_role, authenticated, anon', v_table);
  END LOOP;
END $$;

DO $$
DECLARE
  v_table TEXT;
BEGIN
  FOR v_table IN
    SELECT unnest(ARRAY[
      'email_accounts',
      'email_templates',
      'email_variables',
      'emails'
    ]::TEXT[])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON core.%I', 'trg_core_' || v_table || '_updated_at', v_table);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON core.%I FOR EACH ROW EXECUTE PROCEDURE core.set_updated_at()',
      'trg_core_' || v_table || '_updated_at',
      v_table
    );
  END LOOP;
END $$;

GRANT ALL ON ALL TABLES IN SCHEMA core TO authenticated, service_role, anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA core TO authenticated, service_role, anon;
