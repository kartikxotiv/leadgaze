
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255),
  email VARCHAR(255),
  phone_number INTEGER,
  company_id UUID REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE,
  location VARCHAR(255),
  description TEXT,
  contact_time_zone VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_contacts_workspace_id ON public.contacts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON public.contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(email);


ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;


