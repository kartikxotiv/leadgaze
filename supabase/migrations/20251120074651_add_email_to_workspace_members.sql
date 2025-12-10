ALTER TABLE public.workspace_members 
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

ALTER TABLE public.workspace_members 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
DO $$
BEGIN
  ALTER TABLE public.workspace_members 
  ALTER COLUMN user_id DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN
    -- Column might already be nullable, ignore error
    NULL;
END $$;

ALTER TABLE public.workspace_members 
DROP CONSTRAINT IF EXISTS workspace_members_user_or_email_check;

ALTER TABLE public.workspace_members 
ADD CONSTRAINT workspace_members_user_or_email_check 
CHECK (user_id IS NOT NULL OR email IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_workspace_members_email ON public.workspace_members(email);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);