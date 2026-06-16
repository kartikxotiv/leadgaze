/*
 * -------------------------------------------------------
 * Migration: Create Service Cloud Core Tables
 * Date: 2026-06-03
 * Description: Creates the dedicated `service_cloud` schema and the
 *              core tables for the Service Cloud helpdesk module.
 *
 *              Service Cloud intentionally reuses the Leadgaze public
 *              schema for platform-owned entities:
 *                - public.workspaces
 *                - public.accounts
 *                - public.workspace_roles / public.role_permissions
 *
 *              Helpdesk-domain data lives in service_cloud. Shared email,
 *              notes, and documents live in the reusable core schema.
 * -------------------------------------------------------
 */

-- =====================================================
-- 0. Create Service Cloud Schema
-- =====================================================

CREATE SCHEMA IF NOT EXISTS service_cloud;

COMMENT ON SCHEMA service_cloud IS 'Dedicated schema for Service Cloud helpdesk and ticket management tables.';

GRANT USAGE ON SCHEMA service_cloud TO authenticated, service_role, anon;

-- =====================================================
-- 1. Shared updated_at Trigger Function
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. Service Cloud Enum Types
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'ticket_source_enum'
      AND n.nspname = 'service_cloud'
  ) THEN
    CREATE TYPE service_cloud.ticket_source_enum AS ENUM (
      'email',
      'manual',
      'portal',
      'phone',
      'chat',
      'api'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'ticket_lifecycle_enum'
      AND n.nspname = 'service_cloud'
  ) THEN
    CREATE TYPE service_cloud.ticket_lifecycle_enum AS ENUM (
      'new',
      'open',
      'in_progress',
      'waiting',
      'resolved',
      'closed'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'activity_event_enum'
      AND n.nspname = 'service_cloud'
  ) THEN
    CREATE TYPE service_cloud.activity_event_enum AS ENUM (
      'ticket_created',
      'ticket_updated',
      'ticket_assigned',
      'ticket_reassigned',
      'status_changed',
      'priority_changed',
      'category_changed',
      'customer_replied',
      'agent_replied',
      'internal_note_added',
      'email_linked',
      'document_linked',
      'time_logged',
      'ticket_resolved',
      'ticket_closed',
      'ticket_reopened',
      'system_event'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'notification_channel_enum'
      AND n.nspname = 'service_cloud'
  ) THEN
    CREATE TYPE service_cloud.notification_channel_enum AS ENUM (
      'in_app',
      'email'
    );
  END IF;
END $$;

-- =====================================================
-- 3. Customer Organizations
-- =====================================================

CREATE TABLE IF NOT EXISTS service_cloud.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  website VARCHAR(500),
  industry VARCHAR(120),
  phone VARCHAR(50),
  email VARCHAR(255),
  address_line_1 VARCHAR(255),
  address_line_2 VARCHAR(255),
  city VARCHAR(120),
  state VARCHAR(120),
  postal_code VARCHAR(40),
  country VARCHAR(120),
  owner_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sc_organizations_name_unique UNIQUE (workspace_id, name)
);

COMMENT ON TABLE service_cloud.organizations IS 'Customer organizations for Service Cloud support tickets.';

CREATE INDEX IF NOT EXISTS idx_sc_organizations_workspace ON service_cloud.organizations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sc_organizations_owner ON service_cloud.organizations(owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sc_organizations_active ON service_cloud.organizations(workspace_id, is_deleted) WHERE is_deleted = FALSE;

-- =====================================================
-- 4. Customers
-- =====================================================

CREATE TABLE IF NOT EXISTS service_cloud.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES service_cloud.organizations(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  job_title VARCHAR(150),
  timezone VARCHAR(80),
  locale VARCHAR(20),
  external_reference VARCHAR(255),
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE service_cloud.customers IS 'Individual customer contacts who raise support requests.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_sc_customers_email_unique
  ON service_cloud.customers(workspace_id, lower(email))
  WHERE email IS NOT NULL AND is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_sc_customers_workspace ON service_cloud.customers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sc_customers_organization ON service_cloud.customers(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sc_customers_active ON service_cloud.customers(workspace_id, is_deleted) WHERE is_deleted = FALSE;

-- =====================================================
-- 5. Support Teams
-- =====================================================

CREATE TABLE IF NOT EXISTS service_cloud.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  manager_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  email_alias VARCHAR(255),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sc_teams_name_unique UNIQUE (workspace_id, name)
);

COMMENT ON TABLE service_cloud.teams IS 'Support teams such as Technical Support, Billing, and Escalations.';

CREATE INDEX IF NOT EXISTS idx_sc_teams_workspace ON service_cloud.teams(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sc_teams_manager ON service_cloud.teams(manager_id) WHERE manager_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sc_teams_active ON service_cloud.teams(workspace_id, is_active) WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS service_cloud.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES service_cloud.teams(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  is_team_lead BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sc_team_members_unique UNIQUE (team_id, account_id)
);

COMMENT ON TABLE service_cloud.team_members IS 'Maps support agents to one or more Service Cloud teams.';

CREATE INDEX IF NOT EXISTS idx_sc_team_members_workspace ON service_cloud.team_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sc_team_members_team ON service_cloud.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_sc_team_members_account ON service_cloud.team_members(account_id);

-- =====================================================
-- 6. Ticket Taxonomy
-- =====================================================

CREATE TABLE IF NOT EXISTS service_cloud.ticket_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  status_key VARCHAR(80) NOT NULL,
  lifecycle service_cloud.ticket_lifecycle_enum NOT NULL DEFAULT 'open',
  description TEXT,
  color VARCHAR(20),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sc_ticket_statuses_key_unique UNIQUE (workspace_id, status_key),
  CONSTRAINT sc_ticket_statuses_name_unique UNIQUE (workspace_id, name)
);

COMMENT ON TABLE service_cloud.ticket_statuses IS 'Configurable ticket statuses with lifecycle classification for reporting.';

CREATE INDEX IF NOT EXISTS idx_sc_ticket_statuses_workspace ON service_cloud.ticket_statuses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sc_ticket_statuses_order ON service_cloud.ticket_statuses(workspace_id, display_order);
CREATE INDEX IF NOT EXISTS idx_sc_ticket_statuses_lifecycle ON service_cloud.ticket_statuses(workspace_id, lifecycle);

CREATE TABLE IF NOT EXISTS service_cloud.ticket_priorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  priority_key VARCHAR(80) NOT NULL,
  severity_order INTEGER NOT NULL DEFAULT 0,
  color VARCHAR(20),
  response_due_minutes INTEGER,
  resolution_due_minutes INTEGER,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sc_ticket_priorities_key_unique UNIQUE (workspace_id, priority_key),
  CONSTRAINT sc_ticket_priorities_name_unique UNIQUE (workspace_id, name),
  CONSTRAINT sc_ticket_priorities_due_check CHECK (
    (response_due_minutes IS NULL OR response_due_minutes > 0)
    AND (resolution_due_minutes IS NULL OR resolution_due_minutes > 0)
  )
);

COMMENT ON TABLE service_cloud.ticket_priorities IS 'Configurable ticket priority levels and future SLA timing hints.';

CREATE INDEX IF NOT EXISTS idx_sc_ticket_priorities_workspace ON service_cloud.ticket_priorities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sc_ticket_priorities_severity ON service_cloud.ticket_priorities(workspace_id, severity_order);

CREATE TABLE IF NOT EXISTS service_cloud.ticket_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  parent_category_id UUID REFERENCES service_cloud.ticket_categories(id) ON DELETE SET NULL,
  name VARCHAR(150) NOT NULL,
  category_key VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sc_ticket_categories_key_unique UNIQUE (workspace_id, category_key),
  CONSTRAINT sc_ticket_categories_name_unique UNIQUE (workspace_id, name)
);

COMMENT ON TABLE service_cloud.ticket_categories IS 'Configurable support issue categories.';

CREATE INDEX IF NOT EXISTS idx_sc_ticket_categories_workspace ON service_cloud.ticket_categories(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sc_ticket_categories_parent ON service_cloud.ticket_categories(parent_category_id) WHERE parent_category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sc_ticket_categories_active ON service_cloud.ticket_categories(workspace_id, is_active) WHERE is_active = TRUE;

-- =====================================================
-- 7. Shared Core Capability Usage
-- =====================================================

-- Service Cloud intentionally does not create module-local email, note, or
-- document storage. Use:
--   core.emails + service_cloud.ticket_emails for ticket email conversations
--   core.notes + core.note_relations(entity_type = 'service_cloud_ticket')
--   core.documents + core.document_relations(entity_type = 'service_cloud_ticket')

-- =====================================================
-- 8. Ticket Number Sequence
-- =====================================================

CREATE TABLE IF NOT EXISTS service_cloud.ticket_sequences (
  workspace_id UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  last_number BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE service_cloud.ticket_sequences IS 'Workspace-scoped counter used to allocate stable human-readable ticket numbers.';

-- =====================================================
-- 9. Tickets
-- =====================================================

CREATE TABLE IF NOT EXISTS service_cloud.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ticket_number BIGINT NOT NULL,
  subject VARCHAR(500) NOT NULL,
  description TEXT,
  source service_cloud.ticket_source_enum NOT NULL DEFAULT 'manual',
  status_id UUID NOT NULL REFERENCES service_cloud.ticket_statuses(id) ON DELETE RESTRICT,
  priority_id UUID REFERENCES service_cloud.ticket_priorities(id) ON DELETE SET NULL,
  category_id UUID REFERENCES service_cloud.ticket_categories(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES service_cloud.customers(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES service_cloud.organizations(id) ON DELETE SET NULL,
  support_email_account_id BIGINT REFERENCES core.email_accounts(id) ON DELETE SET NULL,
  assigned_agent_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  assigned_team_id UUID REFERENCES service_cloud.teams(id) ON DELETE SET NULL,
  first_response_at TIMESTAMPTZ,
  last_customer_response_at TIMESTAMPTZ,
  last_agent_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  due_at TIMESTAMPTZ,
  response_due_at TIMESTAMPTZ,
  total_logged_seconds INTEGER NOT NULL DEFAULT 0,
  email_count INTEGER NOT NULL DEFAULT 0,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sc_tickets_number_unique UNIQUE (workspace_id, ticket_number),
  CONSTRAINT sc_tickets_total_logged_check CHECK (total_logged_seconds >= 0),
  CONSTRAINT sc_tickets_email_count_check CHECK (email_count >= 0)
);

COMMENT ON TABLE service_cloud.tickets IS 'Support tickets tracking customer issues from creation to resolution.';

CREATE INDEX IF NOT EXISTS idx_sc_tickets_workspace ON service_cloud.tickets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sc_tickets_status ON service_cloud.tickets(status_id);
CREATE INDEX IF NOT EXISTS idx_sc_tickets_priority ON service_cloud.tickets(priority_id) WHERE priority_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sc_tickets_category ON service_cloud.tickets(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sc_tickets_customer ON service_cloud.tickets(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sc_tickets_organization ON service_cloud.tickets(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sc_tickets_support_email_account ON service_cloud.tickets(support_email_account_id) WHERE support_email_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sc_tickets_agent ON service_cloud.tickets(assigned_agent_id) WHERE assigned_agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sc_tickets_team ON service_cloud.tickets(assigned_team_id) WHERE assigned_team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sc_tickets_created_at ON service_cloud.tickets(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sc_tickets_due_at ON service_cloud.tickets(due_at) WHERE due_at IS NOT NULL AND is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sc_tickets_open ON service_cloud.tickets(workspace_id, status_id, assigned_agent_id) WHERE is_deleted = FALSE AND closed_at IS NULL;

-- =====================================================
-- 10. Ticket Email Links
-- =====================================================

CREATE TABLE IF NOT EXISTS service_cloud.ticket_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES service_cloud.tickets(id) ON DELETE CASCADE,
  email_id UUID NOT NULL REFERENCES core.emails(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES service_cloud.customers(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  email_role VARCHAR(50) NOT NULL DEFAULT 'conversation',
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sc_ticket_emails_unique UNIQUE (ticket_id, email_id),
  CONSTRAINT sc_ticket_emails_role_check CHECK (
    email_role IN (
      'initial_request',
      'customer_reply',
      'agent_reply',
      'forward',
      'conversation'
    )
  )
);

COMMENT ON TABLE service_cloud.ticket_emails IS 'Links Service Cloud tickets to reusable core.emails records and stores ticket-specific email context.';

CREATE INDEX IF NOT EXISTS idx_sc_ticket_emails_workspace ON service_cloud.ticket_emails(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sc_ticket_emails_ticket ON service_cloud.ticket_emails(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sc_ticket_emails_email ON service_cloud.ticket_emails(email_id);
CREATE INDEX IF NOT EXISTS idx_sc_ticket_emails_customer ON service_cloud.ticket_emails(customer_id) WHERE customer_id IS NOT NULL;

-- =====================================================
-- 11. Time Tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS service_cloud.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES service_cloud.tickets(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  team_id UUID REFERENCES service_cloud.teams(id) ON DELETE SET NULL,
  description TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL,
  logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
  billable BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sc_time_entries_duration_check CHECK (duration_seconds > 0),
  CONSTRAINT sc_time_entries_time_check CHECK (start_time IS NULL OR end_time IS NULL OR end_time >= start_time)
);

COMMENT ON TABLE service_cloud.time_entries IS 'Manual time logs measuring agent effort spent on tickets.';

CREATE INDEX IF NOT EXISTS idx_sc_time_entries_workspace ON service_cloud.time_entries(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sc_time_entries_ticket ON service_cloud.time_entries(ticket_id);
CREATE INDEX IF NOT EXISTS idx_sc_time_entries_account ON service_cloud.time_entries(account_id, logged_date DESC);
CREATE INDEX IF NOT EXISTS idx_sc_time_entries_team ON service_cloud.time_entries(team_id, logged_date DESC) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sc_time_entries_logged_date ON service_cloud.time_entries(workspace_id, logged_date DESC);

-- =====================================================
-- 12. Status Duration and Activity Tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS service_cloud.ticket_status_durations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES service_cloud.tickets(id) ON DELETE CASCADE,
  status_id UUID NOT NULL REFERENCES service_cloud.ticket_statuses(id) ON DELETE RESTRICT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  changed_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sc_status_durations_time_check CHECK (ended_at IS NULL OR ended_at >= started_at),
  CONSTRAINT sc_status_durations_duration_check CHECK (duration_seconds IS NULL OR duration_seconds >= 0)
);

COMMENT ON TABLE service_cloud.ticket_status_durations IS 'Tracks how long each ticket remains in every status.';

CREATE INDEX IF NOT EXISTS idx_sc_status_durations_workspace ON service_cloud.ticket_status_durations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sc_status_durations_ticket ON service_cloud.ticket_status_durations(ticket_id, started_at);
CREATE INDEX IF NOT EXISTS idx_sc_status_durations_status ON service_cloud.ticket_status_durations(status_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sc_status_durations_current_unique
  ON service_cloud.ticket_status_durations(ticket_id)
  WHERE ended_at IS NULL;

CREATE TABLE IF NOT EXISTS service_cloud.ticket_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES service_cloud.tickets(id) ON DELETE CASCADE,
  event_type service_cloud.activity_event_enum NOT NULL,
  actor_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  actor_customer_id UUID REFERENCES service_cloud.customers(id) ON DELETE SET NULL,
  summary TEXT,
  from_value JSONB,
  to_value JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE service_cloud.ticket_activities IS 'Immutable ticket activity timeline for audit and reporting.';

CREATE INDEX IF NOT EXISTS idx_sc_ticket_activities_workspace ON service_cloud.ticket_activities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sc_ticket_activities_ticket ON service_cloud.ticket_activities(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sc_ticket_activities_event_type ON service_cloud.ticket_activities(workspace_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sc_ticket_activities_actor ON service_cloud.ticket_activities(actor_account_id, created_at DESC) WHERE actor_account_id IS NOT NULL;

-- =====================================================
-- 13. Notifications
-- =====================================================

CREATE TABLE IF NOT EXISTS service_cloud.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  event_type service_cloud.activity_event_enum NOT NULL,
  channel service_cloud.notification_channel_enum NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sc_notification_preferences_unique UNIQUE (workspace_id, account_id, event_type, channel)
);

COMMENT ON TABLE service_cloud.notification_preferences IS 'Per-user notification preferences for Service Cloud events.';

CREATE INDEX IF NOT EXISTS idx_sc_notification_preferences_account ON service_cloud.notification_preferences(account_id, workspace_id);

CREATE TABLE IF NOT EXISTS service_cloud.notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES service_cloud.tickets(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES service_cloud.ticket_activities(id) ON DELETE SET NULL,
  recipient_account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  event_type service_cloud.activity_event_enum NOT NULL,
  channel service_cloud.notification_channel_enum NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_sent BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE service_cloud.notification_events IS 'Notification delivery queue/history for assignment, replies, mentions, and closure events.';

CREATE INDEX IF NOT EXISTS idx_sc_notification_events_workspace ON service_cloud.notification_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sc_notification_events_recipient ON service_cloud.notification_events(recipient_account_id, created_at DESC) WHERE recipient_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sc_notification_events_unsent ON service_cloud.notification_events(channel, created_at) WHERE is_sent = FALSE;

-- =====================================================
-- 14. Helper Functions and Triggers
-- =====================================================

CREATE OR REPLACE FUNCTION service_cloud.assign_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
  v_next_number BIGINT;
BEGIN
  IF NEW.ticket_number IS NOT NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO service_cloud.ticket_sequences (workspace_id, last_number)
  VALUES (NEW.workspace_id, 1)
  ON CONFLICT (workspace_id)
  DO UPDATE
    SET last_number = service_cloud.ticket_sequences.last_number + 1,
        updated_at = now()
  RETURNING last_number INTO v_next_number;

  NEW.ticket_number = v_next_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION service_cloud.record_ticket_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO service_cloud.ticket_status_durations (
    workspace_id,
    ticket_id,
    status_id,
    started_at,
    changed_by
  )
  VALUES (
    NEW.workspace_id,
    NEW.id,
    NEW.status_id,
    NEW.created_at,
    NEW.created_by
  );

  INSERT INTO service_cloud.ticket_activities (
    workspace_id,
    ticket_id,
    event_type,
    actor_account_id,
    summary,
    to_value
  )
  VALUES (
    NEW.workspace_id,
    NEW.id,
    'ticket_created',
    NEW.created_by,
    'Ticket created',
    jsonb_build_object(
      'ticket_number', NEW.ticket_number,
      'subject', NEW.subject,
      'status_id', NEW.status_id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION service_cloud.record_ticket_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_event_type service_cloud.activity_event_enum := 'status_changed';
  v_new_lifecycle service_cloud.ticket_lifecycle_enum;
BEGIN
  IF NEW.status_id IS NOT DISTINCT FROM OLD.status_id THEN
    RETURN NEW;
  END IF;

  UPDATE service_cloud.ticket_status_durations
  SET ended_at = now(),
      duration_seconds = GREATEST(0, EXTRACT(EPOCH FROM (now() - started_at))::INTEGER)
  WHERE ticket_id = NEW.id
    AND ended_at IS NULL;

  INSERT INTO service_cloud.ticket_status_durations (
    workspace_id,
    ticket_id,
    status_id,
    started_at,
    changed_by
  )
  VALUES (
    NEW.workspace_id,
    NEW.id,
    NEW.status_id,
    now(),
    NEW.updated_by
  );

  SELECT lifecycle INTO v_new_lifecycle
  FROM service_cloud.ticket_statuses
  WHERE id = NEW.status_id;

  IF v_new_lifecycle = 'resolved' THEN
    v_event_type := 'ticket_resolved';
  ELSIF v_new_lifecycle = 'closed' THEN
    v_event_type := 'ticket_closed';
  ELSIF OLD.closed_at IS NOT NULL AND v_new_lifecycle NOT IN ('resolved', 'closed') THEN
    v_event_type := 'ticket_reopened';
  END IF;

  INSERT INTO service_cloud.ticket_activities (
    workspace_id,
    ticket_id,
    event_type,
    actor_account_id,
    summary,
    from_value,
    to_value
  )
  VALUES (
    NEW.workspace_id,
    NEW.id,
    v_event_type,
    NEW.updated_by,
    'Ticket status changed',
    jsonb_build_object('status_id', OLD.status_id),
    jsonb_build_object('status_id', NEW.status_id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION service_cloud.sync_ticket_time_total()
RETURNS TRIGGER AS $$
DECLARE
  v_ticket_id UUID;
BEGIN
  v_ticket_id := COALESCE(NEW.ticket_id, OLD.ticket_id);

  UPDATE service_cloud.tickets t
  SET total_logged_seconds = COALESCE((
        SELECT SUM(duration_seconds)::INTEGER
        FROM service_cloud.time_entries te
        WHERE te.ticket_id = v_ticket_id
      ), 0),
      updated_at = now()
  WHERE t.id = v_ticket_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION service_cloud.sync_ticket_email_count()
RETURNS TRIGGER AS $$
DECLARE
  v_ticket_id UUID;
BEGIN
  v_ticket_id := COALESCE(NEW.ticket_id, OLD.ticket_id);

  UPDATE service_cloud.tickets t
  SET email_count = COALESCE((
        SELECT COUNT(*)::INTEGER
        FROM service_cloud.ticket_emails te
        WHERE te.ticket_id = v_ticket_id
      ), 0),
      updated_at = now()
  WHERE t.id = v_ticket_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sc_tickets_assign_number ON service_cloud.tickets;
CREATE TRIGGER trg_sc_tickets_assign_number
  BEFORE INSERT ON service_cloud.tickets
  FOR EACH ROW EXECUTE PROCEDURE service_cloud.assign_ticket_number();

DROP TRIGGER IF EXISTS trg_sc_tickets_created ON service_cloud.tickets;
CREATE TRIGGER trg_sc_tickets_created
  AFTER INSERT ON service_cloud.tickets
  FOR EACH ROW EXECUTE PROCEDURE service_cloud.record_ticket_created();

DROP TRIGGER IF EXISTS trg_sc_tickets_status_change ON service_cloud.tickets;
CREATE TRIGGER trg_sc_tickets_status_change
  AFTER UPDATE OF status_id ON service_cloud.tickets
  FOR EACH ROW EXECUTE PROCEDURE service_cloud.record_ticket_status_change();

DROP TRIGGER IF EXISTS trg_sc_time_entries_total_insert ON service_cloud.time_entries;
CREATE TRIGGER trg_sc_time_entries_total_insert
  AFTER INSERT ON service_cloud.time_entries
  FOR EACH ROW EXECUTE PROCEDURE service_cloud.sync_ticket_time_total();

DROP TRIGGER IF EXISTS trg_sc_time_entries_total_update ON service_cloud.time_entries;
CREATE TRIGGER trg_sc_time_entries_total_update
  AFTER UPDATE OF ticket_id, duration_seconds ON service_cloud.time_entries
  FOR EACH ROW EXECUTE PROCEDURE service_cloud.sync_ticket_time_total();

DROP TRIGGER IF EXISTS trg_sc_time_entries_total_delete ON service_cloud.time_entries;
CREATE TRIGGER trg_sc_time_entries_total_delete
  AFTER DELETE ON service_cloud.time_entries
  FOR EACH ROW EXECUTE PROCEDURE service_cloud.sync_ticket_time_total();

DROP TRIGGER IF EXISTS trg_sc_ticket_emails_count_insert ON service_cloud.ticket_emails;
CREATE TRIGGER trg_sc_ticket_emails_count_insert
  AFTER INSERT ON service_cloud.ticket_emails
  FOR EACH ROW EXECUTE PROCEDURE service_cloud.sync_ticket_email_count();

DROP TRIGGER IF EXISTS trg_sc_ticket_emails_count_delete ON service_cloud.ticket_emails;
CREATE TRIGGER trg_sc_ticket_emails_count_delete
  AFTER DELETE ON service_cloud.ticket_emails
  FOR EACH ROW EXECUTE PROCEDURE service_cloud.sync_ticket_email_count();

-- =====================================================
-- 15. updated_at Triggers
-- =====================================================

DO $$
DECLARE
  v_table TEXT;
BEGIN
  FOR v_table IN
    SELECT unnest(ARRAY[
      'organizations',
      'customers',
      'teams',
      'ticket_statuses',
      'ticket_priorities',
      'ticket_categories',
      'tickets',
      'time_entries',
      'notification_preferences'
    ]::TEXT[])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON service_cloud.%I', 'trg_sc_' || v_table || '_updated_at', v_table);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON service_cloud.%I FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column()',
      'trg_sc_' || v_table || '_updated_at',
      v_table
    );
  END LOOP;
END $$;

-- =====================================================
-- 16. Reporting Views
-- =====================================================

CREATE OR REPLACE VIEW service_cloud.ticket_time_summary AS
SELECT
  t.workspace_id,
  t.id AS ticket_id,
  t.ticket_number,
  t.subject,
  t.total_logged_seconds,
  MAX(te.created_at) AS latest_time_entry_at,
  COUNT(te.id)::INTEGER AS time_entry_count
FROM service_cloud.tickets t
LEFT JOIN service_cloud.time_entries te ON te.ticket_id = t.id
GROUP BY t.workspace_id, t.id, t.ticket_number, t.subject, t.total_logged_seconds;

CREATE OR REPLACE VIEW service_cloud.ticket_status_duration_summary AS
SELECT
  d.workspace_id,
  d.ticket_id,
  d.status_id,
  s.name AS status_name,
  s.lifecycle,
  SUM(
    COALESCE(
      d.duration_seconds,
      GREATEST(0, EXTRACT(EPOCH FROM (now() - d.started_at))::INTEGER)
    )
  )::INTEGER AS total_seconds,
  COUNT(*)::INTEGER AS transition_count
FROM service_cloud.ticket_status_durations d
JOIN service_cloud.ticket_statuses s ON s.id = d.status_id
GROUP BY d.workspace_id, d.ticket_id, d.status_id, s.name, s.lifecycle;

-- =====================================================
-- 17. Enable RLS and Grants
-- =====================================================

DO $$
DECLARE
  v_table TEXT;
BEGIN
  FOR v_table IN
    SELECT unnest(ARRAY[
      'organizations',
      'customers',
      'teams',
      'team_members',
      'ticket_statuses',
      'ticket_priorities',
      'ticket_categories',
      'ticket_sequences',
      'tickets',
      'ticket_emails',
      'time_entries',
      'ticket_status_durations',
      'ticket_activities',
      'notification_preferences',
      'notification_events'
    ]::TEXT[])
  LOOP
    EXECUTE format('ALTER TABLE service_cloud.%I ENABLE ROW LEVEL SECURITY', v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON service_cloud.%I', v_table || '_policy', v_table);
    EXECUTE format(
      'CREATE POLICY %I ON service_cloud.%I FOR ALL TO service_role, authenticated, anon USING (true) WITH CHECK (true)',
      v_table || '_policy',
      v_table
    );
    EXECUTE format('GRANT ALL ON service_cloud.%I TO service_role, authenticated, anon', v_table);
  END LOOP;
END $$;

GRANT SELECT ON service_cloud.ticket_time_summary TO service_role, authenticated, anon;
GRANT SELECT ON service_cloud.ticket_status_duration_summary TO service_role, authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA service_cloud TO authenticated, service_role, anon;
