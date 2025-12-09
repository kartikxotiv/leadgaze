-- Ensure meetings_assignees table exists (in case migration wasn't run)
CREATE TABLE IF NOT EXISTS public.meetings_assignees(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON UPDATE CASCADE ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(meeting_id, user_id)
);

-- Enable RLS if not already enabled
ALTER TABLE public.meetings_assignees ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to read meeting assignees" ON public.meetings_assignees;
DROP POLICY IF EXISTS "Allow authenticated users to insert meeting assignees" ON public.meetings_assignees;
DROP POLICY IF EXISTS "Allow authenticated users to update meeting assignees" ON public.meetings_assignees;
DROP POLICY IF EXISTS "Allow authenticated users to delete meeting assignees" ON public.meetings_assignees;

-- Create RLS policies for meetings_assignees
-- Allow authenticated users to read meeting assignees if they're in the same workspace as the meeting
CREATE POLICY "Allow authenticated users to read meeting assignees"
  ON public.meetings_assignees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = meetings_assignees.meeting_id
      AND EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
        AND wm.workspace_id = m.workspace_id
        AND wm.is_deleted = false
      )
    )
  );

-- Allow authenticated users to insert meeting assignees if they're in the same workspace as the meeting
CREATE POLICY "Allow authenticated users to insert meeting assignees"
  ON public.meetings_assignees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = meetings_assignees.meeting_id
      AND EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
        AND wm.workspace_id = m.workspace_id
        AND wm.is_deleted = false
      )
    )
  );

-- Allow authenticated users to update meeting assignees if they're in the same workspace as the meeting
CREATE POLICY "Allow authenticated users to update meeting assignees"
  ON public.meetings_assignees
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = meetings_assignees.meeting_id
      AND EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
        AND wm.workspace_id = m.workspace_id
        AND wm.is_deleted = false
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = meetings_assignees.meeting_id
      AND EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
        AND wm.workspace_id = m.workspace_id
        AND wm.is_deleted = false
      )
    )
  );

-- Allow authenticated users to delete meeting assignees if they're in the same workspace as the meeting
CREATE POLICY "Allow authenticated users to delete meeting assignees"
  ON public.meetings_assignees
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = meetings_assignees.meeting_id
      AND EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
        AND wm.workspace_id = m.workspace_id
        AND wm.is_deleted = false
      )
    )
  );

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_meetings_assignees_meeting_id ON public.meetings_assignees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meetings_assignees_user_id ON public.meetings_assignees(user_id);

