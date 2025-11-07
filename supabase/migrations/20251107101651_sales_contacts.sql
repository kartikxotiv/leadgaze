CREATE TYPE IF NOT EXISTS public.sales_contact_status AS ENUM ('pending','moved_to_lead','rejected');
CREATE TABLE IF NOT EXISTS public.sales_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE,

  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255),
  email VARCHAR(255),
  phone_number INTEGER,
  company_id UUID REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE SET NULL,
  location VARCHAR(255),
  contact_time_zone VARCHAR(100),
  status public.sales_contact_status NOT NULL DEFAULT 'pending',
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  platform VARCHAR REFERENCES public.contact_platforms(id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL
);

ALTER TABLE public.sales_contacts ENABLE ROW LEVEL SECURITY;

