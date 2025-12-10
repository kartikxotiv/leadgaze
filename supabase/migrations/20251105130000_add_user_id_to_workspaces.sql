ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON public.workspaces(user_id);
COMMENT ON COLUMN public.workspaces.user_id IS 'Reference to the user who created or owns this workspace';

