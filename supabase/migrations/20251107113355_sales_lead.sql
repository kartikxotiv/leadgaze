DO $$
BEGIN
  CREATE TYPE public.sales_lead_status AS ENUM ('in_progress','pipeline','won','lost');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.sales_leads (
    
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE,

  contact_id UUID REFERENCES public.sales_contacts(id) ON UPDATE CASCADE ON DELETE SET NULL,

  created_by UUID REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL,

  owner_id UUID REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL,

  status public.sales_lead_status NOT NULL DEFAULT 'pipeline',

  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255),
  email VARCHAR(255),
  phone_number INTEGER,
  location VARCHAR(255),
  platform INTEGER REFERENCES public.contact_platforms(id) ON UPDATE CASCADE ON DELETE SET NULL,
  priority UUID REFERENCES public.lead_priorities(id) ON UPDATE CASCADE ON DELETE SET NULL,
  contact_time_zone VARCHAR(100),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_leads ENABLE ROW LEVEL SECURITY;

