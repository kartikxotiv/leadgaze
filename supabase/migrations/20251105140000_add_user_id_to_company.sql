ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON public.companies(user_id);
COMMENT ON COLUMN public.companies.user_id IS 'Reference to the user who created or owns this company';

