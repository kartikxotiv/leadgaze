-- Create task table
CREATE TABLE IF NOT EXISTS public.tasks (
  task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL DEFAULT 'Task',
  priority VARCHAR(50) NOT NULL DEFAULT 'Medium',
  status VARCHAR(50) NOT NULL DEFAULT 'Pending',
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  lead_id UUID REFERENCES public.leads (lead_id) ON UPDATE CASCADE ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals (deal_id) ON UPDATE CASCADE ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.users (user_id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.users (user_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create lead_scores table
CREATE TABLE IF NOT EXISTS public.lead_scores (
  score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL UNIQUE REFERENCES public.leads (lead_id) ON UPDATE CASCADE ON DELETE CASCADE,
  total_score INTEGER NOT NULL DEFAULT 0,
  tier VARCHAR(20) NOT NULL DEFAULT 'cold',
  last_calculated TIMESTAMPTZ NOT NULL DEFAULT now(),
  score_breakdown JSONB,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add CHECK constraint for tier values
ALTER TABLE public.lead_scores
  ADD CONSTRAINT lead_scores_tier_check CHECK (tier IN ('cold', 'warm', 'hot', 'burning'));

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  channel VARCHAR(20) NOT NULL DEFAULT 'in_app',
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  action_url VARCHAR(500),
  action_label VARCHAR(100),
  related_type VARCHAR(20),
  related_id UUID,
  organization_id UUID NOT NULL,
  sent_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create automation_rules table
CREATE TABLE IF NOT EXISTS public.automation_rules (
  rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger VARCHAR(50) NOT NULL,
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 1,
  last_triggered TIMESTAMPTZ,
  trigger_count INTEGER NOT NULL DEFAULT 0,
  organization_id UUID NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create scoring_rules table
CREATE TABLE IF NOT EXISTS public.scoring_rules (
  rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name VARCHAR(255) NOT NULL,
  rule_type VARCHAR(50) NOT NULL,
  condition JSONB NOT NULL,
  points INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  organization_id UUID NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create org_user_accounts table
CREATE TABLE IF NOT EXISTS public.org_user_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create organization_workspaces table
CREATE TABLE IF NOT EXISTS public.organization_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (organization_id) ON DELETE CASCADE ON UPDATE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  status_id UUID REFERENCES public.organization_config (id),
  created_by UUID NOT NULL REFERENCES public.users (user_id),
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint for organization_id + slug
ALTER TABLE public.organization_workspaces
  ADD CONSTRAINT organization_workspaces_organization_id_slug_key UNIQUE (organization_id, slug);

-- Unique constraint for organization_id + email in org_user_accounts
ALTER TABLE public.org_user_accounts
  ADD CONSTRAINT org_user_accounts_org_email_unique UNIQUE (organization_id, email);

-- Enable row level security (optional)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_workspaces ENABLE ROW LEVEL SECURITY;

-- To rollback all: DROP TABLE IF EXISTS for each table
-- DROP TABLE IF EXISTS public.tasks CASCADE;
-- DROP TABLE IF EXISTS public.lead_scores CASCADE;
-- etc.

