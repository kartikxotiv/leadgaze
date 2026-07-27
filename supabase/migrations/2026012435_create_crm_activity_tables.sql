-- 1. Create CRM Notes
CREATE TABLE IF NOT EXISTS public.crm_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Content
  content TEXT NOT NULL,
  
  -- Polymorphic Relationship
  entity_type VARCHAR(50) NOT NULL, -- 'lead', 'account', 'contact', 'opportunity'
  entity_id UUID NOT NULL,
  
  -- Metadata
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT crm_notes_content_check CHECK (char_length(content) > 0)
);

CREATE INDEX IF NOT EXISTS idx_crm_notes_workspace ON public.crm_notes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crm_notes_entity ON public.crm_notes(entity_type, entity_id);

-- 2. Create CRM Reminders
CREATE TABLE IF NOT EXISTS public.crm_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Reminder Details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  priority VARCHAR(50) DEFAULT 'medium', -- low, medium, high
  
  -- Status
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  
  -- Polymorphic Relationship
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  
  -- Assignments
  assigned_to UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_crm_reminders_workspace ON public.crm_reminders(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crm_reminders_entity ON public.crm_reminders(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_crm_reminders_assignee ON public.crm_reminders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_reminders_due_date ON public.crm_reminders(due_date);

-- 3. Create CRM Meetings
CREATE TABLE IF NOT EXISTS public.crm_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Meeting Details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  meeting_link VARCHAR(500),
  
  -- Scheduling
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  
  -- Polymorphic Relationship
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  
  -- Metadata
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_crm_meetings_workspace ON public.crm_meetings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crm_meetings_entity ON public.crm_meetings(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_crm_meetings_start ON public.crm_meetings(start_time);

-- 4. Create CRM Documents
CREATE TABLE IF NOT EXISTS public.crm_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- File Details
  name VARCHAR(255) NOT NULL,
  file_path VARCHAR(1000) NOT NULL, -- Storage path
  file_type VARCHAR(100), -- MIME type
  size_bytes BIGINT,
  
  -- Polymorphic Relationship
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  
  -- Metadata
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_crm_documents_workspace ON public.crm_documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crm_documents_entity ON public.crm_documents(entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.crm_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_documents ENABLE ROW LEVEL SECURITY;

-- Policies (Permissive for workspace members for now)
CREATE POLICY crm_notes_policy ON public.crm_notes FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY crm_reminders_policy ON public.crm_reminders FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY crm_meetings_policy ON public.crm_meetings FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY crm_documents_policy ON public.crm_documents FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

-- 5. Storage Bucket for Documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('crm_documents', 'crm_documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies (Permissive for now)
CREATE POLICY "crm_documents_public_policy" ON storage.objects
  FOR ALL TO anon, authenticated, service_role
  USING (bucket_id = 'crm_documents')
  WITH CHECK (bucket_id = 'crm_documents');
