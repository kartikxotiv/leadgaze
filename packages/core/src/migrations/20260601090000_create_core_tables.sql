-- Leadgaze Core reusable entity capabilities
-- Notes, meetings, emails, documents, activities, and reminders use relation
-- tables so business modules stay decoupled.

CREATE SCHEMA IF NOT EXISTS core;

GRANT USAGE ON SCHEMA core TO authenticated, service_role, anon;

CREATE OR REPLACE FUNCTION core.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS core.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.note_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  note_id UUID NOT NULL REFERENCES core.notes(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.meeting_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL REFERENCES core.meetings(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  thread_id UUID,
  direction TEXT NOT NULL DEFAULT 'outbound',
  from_email TEXT,
  to_email TEXT NOT NULL,
  cc TEXT,
  bcc TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.email_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email_id UUID NOT NULL REFERENCES core.emails(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_type TEXT,
  file_size BIGINT,
  category TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.document_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES core.documents(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_at TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.reminder_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  reminder_id UUID NOT NULL REFERENCES core.reminders(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_core_notes_workspace ON core.notes(workspace_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_core_note_relations_entity ON core.note_relations(workspace_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_core_note_relations_note ON core.note_relations(note_id);

CREATE INDEX IF NOT EXISTS idx_core_meetings_workspace ON core.meetings(workspace_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_core_meeting_relations_entity ON core.meeting_relations(workspace_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_core_meeting_relations_meeting ON core.meeting_relations(meeting_id);

CREATE INDEX IF NOT EXISTS idx_core_emails_workspace ON core.emails(workspace_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_core_emails_thread ON core.emails(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_email_relations_entity ON core.email_relations(workspace_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_core_email_relations_email ON core.email_relations(email_id);

CREATE INDEX IF NOT EXISTS idx_core_documents_workspace ON core.documents(workspace_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_core_document_relations_entity ON core.document_relations(workspace_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_core_document_relations_document ON core.document_relations(document_id);

CREATE INDEX IF NOT EXISTS idx_core_activities_entity ON core.activities(workspace_id, entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_core_reminders_workspace ON core.reminders(workspace_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_core_reminders_due ON core.reminders(workspace_id, due_at) WHERE is_deleted = FALSE AND status <> 'completed';
CREATE INDEX IF NOT EXISTS idx_core_reminder_relations_entity ON core.reminder_relations(workspace_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_core_reminder_relations_reminder ON core.reminder_relations(reminder_id);

DROP TRIGGER IF EXISTS set_core_notes_updated_at ON core.notes;
CREATE TRIGGER set_core_notes_updated_at BEFORE UPDATE ON core.notes FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
DROP TRIGGER IF EXISTS set_core_meetings_updated_at ON core.meetings;
CREATE TRIGGER set_core_meetings_updated_at BEFORE UPDATE ON core.meetings FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
DROP TRIGGER IF EXISTS set_core_emails_updated_at ON core.emails;
CREATE TRIGGER set_core_emails_updated_at BEFORE UPDATE ON core.emails FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
DROP TRIGGER IF EXISTS set_core_documents_updated_at ON core.documents;
CREATE TRIGGER set_core_documents_updated_at BEFORE UPDATE ON core.documents FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
DROP TRIGGER IF EXISTS set_core_activities_updated_at ON core.activities;
CREATE TRIGGER set_core_activities_updated_at BEFORE UPDATE ON core.activities FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
DROP TRIGGER IF EXISTS set_core_reminders_updated_at ON core.reminders;
CREATE TRIGGER set_core_reminders_updated_at BEFORE UPDATE ON core.reminders FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

ALTER TABLE core.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.note_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.meeting_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.email_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.document_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.reminder_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notes_policy ON core.notes;
CREATE POLICY notes_policy ON core.notes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS note_relations_policy ON core.note_relations;
CREATE POLICY note_relations_policy ON core.note_relations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS meetings_policy ON core.meetings;
CREATE POLICY meetings_policy ON core.meetings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS meeting_relations_policy ON core.meeting_relations;
CREATE POLICY meeting_relations_policy ON core.meeting_relations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS emails_policy ON core.emails;
CREATE POLICY emails_policy ON core.emails FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS email_relations_policy ON core.email_relations;
CREATE POLICY email_relations_policy ON core.email_relations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS documents_policy ON core.documents;
CREATE POLICY documents_policy ON core.documents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS document_relations_policy ON core.document_relations;
CREATE POLICY document_relations_policy ON core.document_relations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS activities_policy ON core.activities;
CREATE POLICY activities_policy ON core.activities FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS reminders_policy ON core.reminders;
CREATE POLICY reminders_policy ON core.reminders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS reminder_relations_policy ON core.reminder_relations;
CREATE POLICY reminder_relations_policy ON core.reminder_relations FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON ALL TABLES IN SCHEMA core TO authenticated, service_role, anon;
