-- Migrate crm_reminders and crm_documents to core schema

-- 1. Add assigned_to column to core.reminders
ALTER TABLE core.reminders 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.accounts(id) ON DELETE SET NULL;

-- Create index on core.reminders for assigned_to
CREATE INDEX IF NOT EXISTS idx_core_reminders_assigned_to ON core.reminders(assigned_to);

-- Redirect foreign key on public.reminder_notifications_sent to core.reminders
ALTER TABLE public.reminder_notifications_sent DROP CONSTRAINT IF EXISTS reminder_notifications_sent_reminder_id_fkey;
ALTER TABLE public.reminder_notifications_sent ADD CONSTRAINT reminder_notifications_sent_reminder_id_fkey FOREIGN KEY (reminder_id) REFERENCES core.reminders(id) ON DELETE CASCADE;

-- 2. Migrate reminders
INSERT INTO core.reminders (
  id,
  workspace_id,
  title,
  description,
  due_at,
  priority,
  status,
  completed_at,
  completed_by,
  is_deleted,
  deleted_at,
  created_by,
  created_at,
  updated_at,
  assigned_to
)
SELECT 
  id,
  workspace_id,
  title,
  description,
  due_date,
  priority,
  CASE WHEN is_completed THEN 'completed' ELSE 'open' END,
  completed_at,
  CASE WHEN is_completed THEN assigned_to ELSE NULL END,
  is_deleted,
  deleted_at,
  created_by,
  created_at,
  updated_at,
  assigned_to
FROM public.crm_reminders
ON CONFLICT (id) DO NOTHING;

-- 3. Populate reminder relations
INSERT INTO core.reminder_relations (
  workspace_id,
  reminder_id,
  entity_type,
  entity_id
)
SELECT 
  workspace_id,
  id,
  CASE 
    WHEN entity_type = 'lead' THEN 'sales_lead'
    WHEN entity_type = 'contact' THEN 'sales_contact'
    WHEN entity_type = 'account' THEN 'sales_account'
    WHEN entity_type = 'opportunity' THEN 'sales_opportunity'
    ELSE entity_type
  END,
  entity_id
FROM public.crm_reminders
ON CONFLICT DO NOTHING;

-- 4. Migrate documents
INSERT INTO core.documents (
  id,
  workspace_id,
  name,
  description,
  file_path,
  file_url,
  file_type,
  file_size,
  category,
  is_deleted,
  deleted_at,
  created_by,
  created_at,
  updated_at
)
SELECT 
  id,
  workspace_id,
  name,
  NULL, -- description does not exist in crm_documents
  file_path,
  NULL, -- file_url does not exist in crm_documents
  file_type,
  size_bytes,
  NULL, -- category does not exist in crm_documents
  is_deleted,
  deleted_at,
  created_by,
  created_at,
  updated_at
FROM public.crm_documents
ON CONFLICT (id) DO NOTHING;

-- 5. Populate document relations
INSERT INTO core.document_relations (
  workspace_id,
  document_id,
  entity_type,
  entity_id
)
SELECT 
  workspace_id,
  id,
  CASE 
    WHEN entity_type = 'lead' THEN 'sales_lead'
    WHEN entity_type = 'contact' THEN 'sales_contact'
    WHEN entity_type = 'account' THEN 'sales_account'
    WHEN entity_type = 'opportunity' THEN 'sales_opportunity'
    ELSE entity_type
  END,
  entity_id
FROM public.crm_documents
ON CONFLICT DO NOTHING;
