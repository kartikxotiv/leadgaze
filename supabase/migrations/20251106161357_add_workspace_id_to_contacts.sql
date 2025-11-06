-- Add workspace_id column back to contacts table
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_contacts_workspace_id ON public.contacts(workspace_id);

-- Update existing contacts to have workspace_id from their company
-- For contacts with a company_id, set workspace_id from the company
UPDATE public.contacts c
SET workspace_id = co.workspace_id
FROM public.companies co
WHERE c.company_id = co.id
  AND c.workspace_id IS NULL;

-- For contacts without a company_id, we'll leave workspace_id as NULL for now
-- These will need to be manually updated or assigned when a company is added

COMMENT ON COLUMN public.contacts.workspace_id IS 'Reference to the workspace this contact belongs to';

