-- Create deals table
CREATE TABLE IF NOT EXISTS public.deals (
  deal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads (lead_id) ON UPDATE CASCADE ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  value DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
  stage VARCHAR(50) NOT NULL DEFAULT 'qualification',
  probability INTEGER NOT NULL DEFAULT 10,
  source VARCHAR(100),
  priority VARCHAR(50) NOT NULL DEFAULT 'medium',
  expected_close_date TIMESTAMPTZ,
  actual_close_date TIMESTAMPTZ,
  lost_reason VARCHAR(255),
  user_id UUID NOT NULL REFERENCES public.users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES public.organizations (organization_id) ON UPDATE CASCADE ON DELETE CASCADE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Constraint for probability between 0 and 100
ALTER TABLE public.deals
  ADD CONSTRAINT deals_probability_check CHECK (probability >= 0 AND probability <= 100);

-- Create activities table
CREATE TABLE IF NOT EXISTS public.activities (
  activity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type VARCHAR(50) NOT NULL,
  related_type VARCHAR(50) NOT NULL,
  related_id UUID NOT NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT,
  outcome VARCHAR(100),
  direction VARCHAR(8),
  duration_minutes INTEGER,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  priority VARCHAR(50) NOT NULL DEFAULT 'medium',
  user_id UUID NOT NULL REFERENCES public.users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  next_followup_date TIMESTAMPTZ,
  file_url VARCHAR(500),
  file_name VARCHAR(255),
  file_type VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Check constraint for direction
ALTER TABLE public.activities
  ADD CONSTRAINT activities_direction_check CHECK (direction IN ('inbound', 'outbound'));

-- Check constraint for duration_minutes
ALTER TABLE public.activities
  ADD CONSTRAINT activities_duration_minutes_check CHECK (duration_minutes >= 0);

-- Enable row level security (optional)
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- To rollback the migration, drop tables:
-- DROP TABLE IF EXISTS public.deals CASCADE;
-- DROP TABLE IF EXISTS public.activities CASCADE;
