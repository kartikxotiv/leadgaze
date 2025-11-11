ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON public.contacts(user_id);
COMMENT ON COLUMN public.contacts.user_id IS 'Reference to the user who created or owns this contact';

