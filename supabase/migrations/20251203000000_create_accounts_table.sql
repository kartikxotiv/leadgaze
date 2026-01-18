CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  sales_lead_id UUID NOT NULL REFERENCES public.sales_leads(id) ON UPDATE CASCADE ON DELETE CASCADE,
  
  business_id UUID REFERENCES public.business(id) ON UPDATE CASCADE ON DELETE SET NULL,
  
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE,
  
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255),
  email VARCHAR(255),
  phone_number VARCHAR(255),
  alternative_email VARCHAR(255),
  alternative_phone_number VARCHAR(255),
  linkedin_url VARCHAR(500),
  location VARCHAR(255),
  contact_time_zone VARCHAR(100),
  business_name VARCHAR(255),
  business_linkedin VARCHAR(500),
  business_contact VARCHAR(255),
  
  platform INTEGER REFERENCES public.contact_platforms(id) ON UPDATE CASCADE ON DELETE SET NULL,
  priority UUID REFERENCES public.lead_priorities(id) ON UPDATE CASCADE ON DELETE SET NULL,
  comment TEXT,
  
  owner_id UUID REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_by UUID REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL,
  
  converted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted_from_lead_at TIMESTAMPTZ, -- When the lead was won
  
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT accounts_sales_lead_id_unique UNIQUE (sales_lead_id)
);

CREATE INDEX IF NOT EXISTS idx_accounts_workspace_id ON public.accounts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_accounts_business_id ON public.accounts(business_id);
CREATE INDEX IF NOT EXISTS idx_accounts_sales_lead_id ON public.accounts(sales_lead_id);
CREATE INDEX IF NOT EXISTS idx_accounts_owner_id ON public.accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_accounts_converted_at ON public.accounts(converted_at);
CREATE INDEX IF NOT EXISTS idx_accounts_is_deleted ON public.accounts(is_deleted) WHERE is_deleted = false;

-- Enable Row Level Security
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
