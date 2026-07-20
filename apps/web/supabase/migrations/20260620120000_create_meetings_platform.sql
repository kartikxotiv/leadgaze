-- =============================================================================
-- Meetings Platform Migration
-- Transforms basic meetings into a full platform-level Meetings System
-- Supports: Manual, Google Meet, Zoom, Microsoft Teams
-- =============================================================================

-- =============================================================================
-- 1. EVOLVE EXISTING core.meetings TABLE
-- Add new fields for provider integration, scheduling, and hosting
-- =============================================================================

-- Meeting type: 'logged' (past meeting) or 'scheduled' (future meeting)
ALTER TABLE core.meetings ADD COLUMN IF NOT EXISTS meeting_type TEXT NOT NULL DEFAULT 'scheduled';

-- Provider: MANUAL, GOOGLE, ZOOM, MICROSOFT_TEAMS
ALTER TABLE core.meetings ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'MANUAL';

-- Timezone for the meeting
ALTER TABLE core.meetings ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';

-- Meeting URL (Google Meet, Zoom, Teams link, or manual URL)
ALTER TABLE core.meetings ADD COLUMN IF NOT EXISTS meeting_url TEXT;

-- Provider-specific IDs for sync
ALTER TABLE core.meetings ADD COLUMN IF NOT EXISTS provider_event_id TEXT;
ALTER TABLE core.meetings ADD COLUMN IF NOT EXISTS provider_meeting_id TEXT;

-- Host user (internal user who hosts the meeting)
ALTER TABLE core.meetings ADD COLUMN IF NOT EXISTS host_user_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;

-- Connected email account used for hosting (from integration_accounts)
ALTER TABLE core.meetings ADD COLUMN IF NOT EXISTS meeting_host_email_account_id UUID;

-- Actual meeting times (for logged meetings or when meeting actually occurred)
ALTER TABLE core.meetings ADD COLUMN IF NOT EXISTS actual_start TIMESTAMPTZ;
ALTER TABLE core.meetings ADD COLUMN IF NOT EXISTS actual_end TIMESTAMPTZ;

-- Rename existing time columns to be more explicit (keep backward compatibility)
-- start_time -> scheduled_start, end_time -> scheduled_end
-- We'll add new columns and keep old ones for backward compatibility
ALTER TABLE core.meetings ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMPTZ;
ALTER TABLE core.meetings ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMPTZ;

-- Migrate existing data
UPDATE core.meetings SET scheduled_start = start_time WHERE scheduled_start IS NULL AND start_time IS NOT NULL;
UPDATE core.meetings SET scheduled_end = end_time WHERE scheduled_end IS NULL AND end_time IS NOT NULL;

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_core_meetings_provider ON core.meetings(workspace_id, provider) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_core_meetings_type ON core.meetings(workspace_id, meeting_type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_core_meetings_scheduled ON core.meetings(workspace_id, scheduled_start) WHERE is_deleted = FALSE AND meeting_type = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_core_meetings_host ON core.meetings(host_user_id) WHERE host_user_id IS NOT NULL;

-- =============================================================================
-- 2. MEETING PARTICIPANTS TABLE
-- Tracks internal and external attendees with RSVP status
-- =============================================================================

CREATE TABLE IF NOT EXISTS core.meeting_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL REFERENCES core.meetings(id) ON DELETE CASCADE,
  
  -- Participant type: INTERNAL (workspace member) or EXTERNAL (email invitee)
  participant_type TEXT NOT NULL DEFAULT 'INTERNAL',
  
  -- For internal participants
  internal_user_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  
  -- For external participants
  external_email TEXT,
  
  -- Display name (for both internal and external)
  display_name TEXT,
  
  -- Is this participant the host?
  is_host BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- RSVP status: PENDING, ACCEPTED, DECLINED, MAYBE
  response_status TEXT NOT NULL DEFAULT 'PENDING',
  
  -- Meeting attendance tracking
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting ON core.meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_workspace ON core.meeting_participants(workspace_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_user ON core.meeting_participants(internal_user_id) WHERE internal_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_meeting_participants_email ON core.meeting_participants(external_email) WHERE external_email IS NOT NULL;

ALTER TABLE core.meeting_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS meeting_participants_policy ON core.meeting_participants;
CREATE POLICY meeting_participants_policy ON core.meeting_participants FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON core.meeting_participants TO authenticated, service_role, anon;

-- =============================================================================
-- 3. MEETING NOTES TABLE
-- Meeting-specific notes, future AI summaries, transcripts
-- =============================================================================

CREATE TABLE IF NOT EXISTS core.meeting_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL REFERENCES core.meetings(id) ON DELETE CASCADE,
  
  -- Note content (markdown supported)
  content TEXT NOT NULL,
  
  -- Note type for future extensibility: 'note', 'summary', 'transcript', 'action_items'
  note_type TEXT NOT NULL DEFAULT 'note',
  
  -- Soft delete
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_notes_meeting ON core.meeting_notes(meeting_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_meeting_notes_workspace ON core.meeting_notes(workspace_id) WHERE is_deleted = FALSE;

ALTER TABLE core.meeting_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS meeting_notes_policy ON core.meeting_notes;
CREATE POLICY meeting_notes_policy ON core.meeting_notes FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON core.meeting_notes TO authenticated, service_role, anon;

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS set_meeting_notes_updated_at ON core.meeting_notes;
CREATE TRIGGER set_meeting_notes_updated_at BEFORE UPDATE ON core.meeting_notes FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-- =============================================================================
-- 4. MEETING REMINDERS TABLE
-- Tracks reminder configuration and delivery status
-- =============================================================================

CREATE TABLE IF NOT EXISTS core.meeting_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL REFERENCES core.meetings(id) ON DELETE CASCADE,
  
  -- Minutes before meeting to send reminder (e.g., 15, 60, 1440 for 1 day)
  offset_minutes INTEGER NOT NULL,
  
  -- Channel: EMAIL, IN_APP, PUSH
  channel TEXT NOT NULL DEFAULT 'EMAIL',
  
  -- When the reminder was actually sent
  sent_at TIMESTAMPTZ,
  
  -- Scheduled send time (computed from meeting time - offset)
  scheduled_at TIMESTAMPTZ NOT NULL,
  
  -- Status: pending, sent, failed, cancelled
  status TEXT NOT NULL DEFAULT 'pending',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_reminders_meeting ON core.meeting_reminders(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_reminders_workspace ON core.meeting_reminders(workspace_id);
CREATE INDEX IF NOT EXISTS idx_meeting_reminders_scheduled ON core.meeting_reminders(scheduled_at) WHERE status = 'pending';

ALTER TABLE core.meeting_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS meeting_reminders_policy ON core.meeting_reminders;
CREATE POLICY meeting_reminders_policy ON core.meeting_reminders FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON core.meeting_reminders TO authenticated, service_role, anon;

-- =============================================================================
-- 5. INTEGRATION CONNECTIONS TABLE
-- Workspace-level integration connections (Google, Zoom, Microsoft, etc.)
-- =============================================================================

CREATE TABLE IF NOT EXISTS core.integration_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Provider: GOOGLE, ZOOM, MICROSOFT, SLACK, etc.
  provider TEXT NOT NULL,
  
  -- Status: active, inactive, error
  status TEXT NOT NULL DEFAULT 'active',
  
  -- Configuration specific to the provider
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Soft delete
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One active connection per provider per user per workspace (allows multiple users to connect their own accounts)
CREATE UNIQUE INDEX IF NOT EXISTS idx_integration_connections_unique 
  ON core.integration_connections(workspace_id, provider, created_by) 
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_integration_connections_workspace ON core.integration_connections(workspace_id) WHERE is_deleted = FALSE;

ALTER TABLE core.integration_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS integration_connections_policy ON core.integration_connections;
CREATE POLICY integration_connections_policy ON core.integration_connections FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON core.integration_connections TO authenticated, service_role, anon;

DROP TRIGGER IF EXISTS set_integration_connections_updated_at ON core.integration_connections;
CREATE TRIGGER set_integration_connections_updated_at BEFORE UPDATE ON core.integration_connections FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-- =============================================================================
-- 6. INTEGRATION ACCOUNTS TABLE
-- Connected external accounts (e.g., john@gmail.com, sales@company.com)
-- =============================================================================

CREATE TABLE IF NOT EXISTS core.integration_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES core.integration_connections(id) ON DELETE CASCADE,
  
  -- External account identifier (email, user ID, etc.)
  external_account_id TEXT NOT NULL,
  
  -- Email associated with this account
  email TEXT,
  
  -- Display name
  display_name TEXT,
  
  -- Provider-specific metadata
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Status: active, inactive, error
  status TEXT NOT NULL DEFAULT 'active',
  
  -- Owner user (who connected this account)
  owner_user_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  
  -- Access scope: private (only owner) or workspace (all members)
  access_scope TEXT NOT NULL DEFAULT 'private',
  
  -- Soft delete
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique external account per connection
CREATE UNIQUE INDEX IF NOT EXISTS idx_integration_accounts_unique 
  ON core.integration_accounts(connection_id, external_account_id) 
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_integration_accounts_workspace ON core.integration_accounts(workspace_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_integration_accounts_connection ON core.integration_accounts(connection_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_integration_accounts_owner ON core.integration_accounts(owner_user_id) WHERE owner_user_id IS NOT NULL;

ALTER TABLE core.integration_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS integration_accounts_policy ON core.integration_accounts;
CREATE POLICY integration_accounts_policy ON core.integration_accounts FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON core.integration_accounts TO authenticated, service_role, anon;

DROP TRIGGER IF EXISTS set_integration_accounts_updated_at ON core.integration_accounts;
CREATE TRIGGER set_integration_accounts_updated_at BEFORE UPDATE ON core.integration_accounts FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-- =============================================================================
-- 7. INTEGRATION TOKENS TABLE
-- OAuth credentials (encrypted)
-- =============================================================================

CREATE TABLE IF NOT EXISTS core.integration_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES core.integration_accounts(id) ON DELETE CASCADE,
  
  -- OAuth tokens (should be encrypted at application level)
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  
  -- Token expiry
  expires_at TIMESTAMPTZ,
  
  -- Token type (e.g., Bearer)
  token_type TEXT DEFAULT 'Bearer',
  
  -- Scopes granted
  scopes TEXT[],
  
  -- Last refresh attempt
  last_refreshed_at TIMESTAMPTZ,
  
  -- Error tracking
  last_error TEXT,
  error_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One token per account
CREATE UNIQUE INDEX IF NOT EXISTS idx_integration_tokens_account 
  ON core.integration_tokens(account_id);

CREATE INDEX IF NOT EXISTS idx_integration_tokens_workspace ON core.integration_tokens(workspace_id);
CREATE INDEX IF NOT EXISTS idx_integration_tokens_expiry ON core.integration_tokens(expires_at) WHERE expires_at IS NOT NULL;

ALTER TABLE core.integration_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS integration_tokens_policy ON core.integration_tokens;
CREATE POLICY integration_tokens_policy ON core.integration_tokens FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON core.integration_tokens TO authenticated, service_role, anon;

DROP TRIGGER IF EXISTS set_integration_tokens_updated_at ON core.integration_tokens;
CREATE TRIGGER set_integration_tokens_updated_at BEFORE UPDATE ON core.integration_tokens FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-- =============================================================================
-- 8. ADD FOREIGN KEY TO core.meetings FOR integration_accounts
-- =============================================================================

-- Add FK constraint for meeting_host_email_account_id
ALTER TABLE core.meetings 
  DROP CONSTRAINT IF EXISTS meetings_host_email_account_fk;
ALTER TABLE core.meetings 
  ADD CONSTRAINT meetings_host_email_account_fk 
  FOREIGN KEY (meeting_host_email_account_id) 
  REFERENCES core.integration_accounts(id) 
  ON DELETE SET NULL;

-- =============================================================================
-- 9. TRIGGERS FOR MEETING TABLES
-- =============================================================================

DROP TRIGGER IF EXISTS set_meeting_participants_updated_at ON core.meeting_participants;
CREATE TRIGGER set_meeting_participants_updated_at BEFORE UPDATE ON core.meeting_participants FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

DROP TRIGGER IF EXISTS set_meeting_reminders_updated_at ON core.meeting_reminders;
CREATE TRIGGER set_meeting_reminders_updated_at BEFORE UPDATE ON core.meeting_reminders FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-- =============================================================================
-- 10. POSTGREST SCHEMA EXPOSURE
-- =============================================================================

-- Ensure all new tables are accessible via PostgREST
GRANT ALL ON ALL TABLES IN SCHEMA core TO authenticated, service_role, anon;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
