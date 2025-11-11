-- Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- To rollback:
-- DROP TABLE IF EXISTS public.companies CASCADE;

