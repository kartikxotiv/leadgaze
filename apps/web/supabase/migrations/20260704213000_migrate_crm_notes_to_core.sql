-- Migrate existing crm_notes to core schema tables

-- 1. Copy records to core.notes
INSERT INTO core.notes (
  id, 
  workspace_id, 
  note, 
  is_deleted, 
  deleted_at, 
  created_by, 
  updated_by, 
  created_at, 
  updated_at
)
SELECT 
  id,
  workspace_id,
  content AS note,
  is_deleted,
  deleted_at,
  created_by,
  created_by AS updated_by,
  created_at,
  updated_at
FROM public.crm_notes
ON CONFLICT (id) DO NOTHING;

-- 2. Copy relationships to core.note_relations with sales_ prefix
INSERT INTO core.note_relations (
  workspace_id, 
  note_id, 
  entity_type, 
  entity_id, 
  created_at
)
SELECT 
  workspace_id,
  id AS note_id,
  'sales_' || entity_type AS entity_type,
  entity_id,
  created_at
FROM public.crm_notes
ON CONFLICT DO NOTHING;
