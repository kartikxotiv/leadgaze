
CREATE TABLE IF NOT EXISTS public.notes_assignees(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES public.notes(id) ON UPDATE CASCADE ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(note_id, user_id)
);


ALTER TABLE public.notes_assignees ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to read note assignees" ON public.notes_assignees;
DROP POLICY IF EXISTS "Allow authenticated users to insert note assignees" ON public.notes_assignees;
DROP POLICY IF EXISTS "Allow authenticated users to update note assignees" ON public.notes_assignees;
DROP POLICY IF EXISTS "Allow authenticated users to delete note assignees" ON public.notes_assignees;

-- Create RLS policies for notes_assignees
-- Allow authenticated users to read note assignees if they're in the same workspace as the note
CREATE POLICY "Allow authenticated users to read note assignees"
  ON public.notes_assignees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.notes n
      WHERE n.id = notes_assignees.note_id
      AND EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
        AND wm.workspace_id = n.workspace_id
        AND wm.is_deleted = false
      )
    )
  );

-- Allow authenticated users to insert note assignees if they're in the same workspace as the note
CREATE POLICY "Allow authenticated users to insert note assignees"
  ON public.notes_assignees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notes n
      WHERE n.id = notes_assignees.note_id
      AND EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
        AND wm.workspace_id = n.workspace_id
        AND wm.is_deleted = false
      )
    )
  );

-- Allow authenticated users to update note assignees if they're in the same workspace as the note
CREATE POLICY "Allow authenticated users to update note assignees"
  ON public.notes_assignees
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.notes n
      WHERE n.id = notes_assignees.note_id
      AND EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
        AND wm.workspace_id = n.workspace_id
        AND wm.is_deleted = false
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notes n
      WHERE n.id = notes_assignees.note_id
      AND EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
        AND wm.workspace_id = n.workspace_id
        AND wm.is_deleted = false
      )
    )
  );

-- Allow authenticated users to delete note assignees if they're in the same workspace as the note
CREATE POLICY "Allow authenticated users to delete note assignees"
  ON public.notes_assignees
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.notes n
      WHERE n.id = notes_assignees.note_id
      AND EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
        AND wm.workspace_id = n.workspace_id
        AND wm.is_deleted = false
      )
    )
  );

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_notes_assignees_note_id ON public.notes_assignees(note_id);
CREATE INDEX IF NOT EXISTS idx_notes_assignees_user_id ON public.notes_assignees(user_id);

