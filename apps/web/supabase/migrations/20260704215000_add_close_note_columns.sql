-- Add columns to core.notes for tracking closed state

ALTER TABLE core.notes 
ADD COLUMN IF NOT EXISTS is_closed BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL;

-- Create index on is_closed for workspace queries
CREATE INDEX IF NOT EXISTS idx_core_notes_is_closed ON core.notes(workspace_id, is_closed) WHERE is_deleted = FALSE;
