CREATE TABLE IF NOT EXISTS public.business (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  business_type TEXT,
  industry TEXT,
  business_contact TEXT,
  business_size TEXT,
  business_country TEXT,
  website TEXT,
  description TEXT,
  account_owner TEXT,
  business_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.business ENABLE ROW LEVEL SECURITY;

