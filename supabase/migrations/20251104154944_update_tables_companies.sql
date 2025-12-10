DROP TABLE IF EXISTS public.companies CASCADE;
DROP TABLE IF EXISTS public.contacts CASCADE;

-- Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  revenue VARCHAR(100),
  industry VARCHAR(100),
  close_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_companies_close_date ON public.companies(close_date);
CREATE INDEX IF NOT EXISTS idx_companies_industry ON public.companies(industry);
CREATE INDEX IF NOT EXISTS idx_companies_location ON public.companies(location);

-- Enable row level security on the table
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;




CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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


CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON public.contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(email);


ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;


