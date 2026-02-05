-- 1. Create CRM Call Logs
CREATE TABLE IF NOT EXISTS public.crm_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Call Details
  subject VARCHAR(255) NOT NULL,
  call_type VARCHAR(50) NOT NULL DEFAULT 'outbound', -- 'inbound', 'outbound'
  status VARCHAR(50) NOT NULL DEFAULT 'completed', -- 'completed', 'missed', 'no_answer', 'voicemail', 'busy', 'failed'
  contact_name VARCHAR(255),
  date_time TIMESTAMPTZ NOT NULL,
  comments TEXT,
  
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
  CONSTRAINT crm_call_logs_subject_check CHECK (char_length(subject) > 0)
);

CREATE INDEX IF NOT EXISTS idx_crm_call_logs_workspace ON public.crm_call_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crm_call_logs_entity ON public.crm_call_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_crm_call_logs_date_time ON public.crm_call_logs(date_time);
CREATE INDEX IF NOT EXISTS idx_crm_call_logs_status ON public.crm_call_logs(status);
CREATE INDEX IF NOT EXISTS idx_crm_call_logs_call_type ON public.crm_call_logs(call_type);

-- Enable RLS
ALTER TABLE public.crm_call_logs ENABLE ROW LEVEL SECURITY;

-- Policies (Permissive for workspace members for now)
CREATE POLICY crm_call_logs_policy ON public.crm_call_logs 
  FOR ALL TO anon, authenticated, service_role 
  USING (true) WITH CHECK (true);
