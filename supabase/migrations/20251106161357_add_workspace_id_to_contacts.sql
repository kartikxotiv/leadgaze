
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE;


CREATE INDEX IF NOT EXISTS idx_contacts_workspace_id ON public.contacts(workspace_id);

UPDATE public.contacts c
SET workspace_id = co.workspace_id
FROM public.companies co
WHERE c.company_id = co.id
  AND c.workspace_id IS NULL;

COMMENT ON COLUMN public.contacts.workspace_id IS 'Reference to the workspace this contact belongs to';

