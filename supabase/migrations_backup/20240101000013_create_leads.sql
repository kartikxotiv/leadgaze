-- Create leads table
CREATE TABLE IF NOT EXISTS public.leads (
  lead_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (organization_id) ON UPDATE CASCADE ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  alt_email VARCHAR(255),
  phone VARCHAR(20),
  alt_phone VARCHAR(20),
  linkedin_profile VARCHAR(500),
  business_name VARCHAR(255),
  company_website VARCHAR(500),
  meta_data JSONB,
  source_id UUID NOT NULL REFERENCES public.leads_config (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  industry_id UUID REFERENCES public.leads_config (id) ON UPDATE CASCADE ON DELETE SET NULL,
  company_size_id UUID REFERENCES public.leads_config (id) ON UPDATE CASCADE ON DELETE SET NULL,
  product_interest TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  status_id UUID NOT NULL REFERENCES public.leads_config (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  assigned_to UUID REFERENCES public.users (user_id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  lead_score INTEGER DEFAULT 0 NOT NULL,
  score_grade_id UUID REFERENCES public.leads_config (id) ON UPDATE CASCADE ON DELETE SET NULL,
  qualification_notes TEXT,
  last_contact_date TIMESTAMPTZ,
  next_followup_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  job_title VARCHAR(100)
);

-- Add check constraint for lead_score >= 0
ALTER TABLE public.leads
  ADD CONSTRAINT leads_lead_score_check CHECK (lead_score >= 0);

-- Add unique constraint on organization_id and email
ALTER TABLE public.leads
  ADD CONSTRAINT leads_org_email_uniq UNIQUE (organization_id, email);

-- Enable row level security (optional, adapt policies as needed)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- To rollback, run:
-- DROP TABLE IF EXISTS public.leads CASCADE;
