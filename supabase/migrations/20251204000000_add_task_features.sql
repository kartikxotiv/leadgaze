-- Add workspace_id to meetings table
ALTER TABLE public.meetings 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Add status column to notes table
ALTER TABLE public.notes 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending';

-- Add due_date to notes table for filtering
ALTER TABLE public.notes 
ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

-- Add status column to meetings table
ALTER TABLE public.meetings 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending';

-- Update existing notes to have status 'Pending' if null
UPDATE public.notes 
SET status = 'Pending' 
WHERE status IS NULL;

-- Update existing meetings to have status 'Pending' if null
UPDATE public.meetings 
SET status = 'Pending' 
WHERE status IS NULL;

-- Update existing meetings with workspace_id from their leads
UPDATE public.meetings m
SET workspace_id = sl.workspace_id
FROM public.sales_leads sl
WHERE m.lead_id = sl.id
  AND m.workspace_id IS NULL
  AND sl.workspace_id IS NOT NULL;

-- Create tasks_assignees table for multiple assignees (similar to leads_assignees)
CREATE TABLE IF NOT EXISTS public.tasks_assignees(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(task_id) ON UPDATE CASCADE ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(task_id, user_id)
);

ALTER TABLE public.tasks_assignees ENABLE ROW LEVEL SECURITY;

-- Create notes_assignees table for multiple assignees
CREATE TABLE IF NOT EXISTS public.notes_assignees(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES public.notes(id) ON UPDATE CASCADE ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(note_id, user_id)
);

-- Create meetings_assignees table for multiple assignees
CREATE TABLE IF NOT EXISTS public.meetings_assignees(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON UPDATE CASCADE ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(meeting_id, user_id)
);

ALTER TABLE public.notes_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings_assignees ENABLE ROW LEVEL SECURITY;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_meetings_workspace_id ON public.meetings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notes_status ON public.notes(status);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON public.meetings(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignees_task_id ON public.tasks_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignees_user_id ON public.tasks_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_assignees_note_id ON public.notes_assignees(note_id);
CREATE INDEX IF NOT EXISTS idx_notes_assignees_user_id ON public.notes_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_meetings_assignees_meeting_id ON public.meetings_assignees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meetings_assignees_user_id ON public.meetings_assignees(user_id);

