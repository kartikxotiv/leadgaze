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
  job_title VARCHAR(100),
  meta_data JSONB,
  source_id UUID NOT NULL REFERENCES public.leads_config (id),
  industry_id UUID REFERENCES public.leads_config (id),
  company_size_id UUID REFERENCES public.leads_config (id),
  product_interest TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  status_id UUID NOT NULL REFERENCES public.leads_config (id),
  assigned_to UUID REFERENCES public.users (user_id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  lead_score INTEGER DEFAULT 0 NOT NULL,
  score_grade_id UUID REFERENCES public.leads_config (id),
  qualification_notes TEXT,
  last_contact_date TIMESTAMPTZ,
  next_followup_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT leads_lead_score_check CHECK (lead_score >= 0)
);

-- Enable Row Level Security
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
