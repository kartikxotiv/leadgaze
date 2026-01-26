
-- 0. Create CRM Industries (New Requirement)
CREATE TABLE IF NOT EXISTS public.crm_industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  industry_name VARCHAR(100) NOT NULL,
  
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT crm_industries_unique UNIQUE (workspace_id, industry_name)
);

CREATE INDEX IF NOT EXISTS idx_crm_industries_workspace ON public.crm_industries(workspace_id);
ALTER TABLE public.crm_industries ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_industries_policy ON public.crm_industries FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);


-- 1. Create CRM Accounts (Business Accounts)
CREATE TABLE IF NOT EXISTS public.crm_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Company Information
  account_name VARCHAR(255) NOT NULL,
  website VARCHAR(500),
  phone_number VARCHAR(255),
  
  -- Industry Reference (Added FK)
  industry_id UUID REFERENCES public.crm_industries(id) ON DELETE SET NULL, 
  -- keeping text field as fallback or cache if needed, but per request moving to table reference, removing text field to be strict.
  -- industry VARCHAR(100), -- Removed in favor of industry_id
  
  company_size VARCHAR(50),
  annual_revenue DECIMAL(15, 2),
  employee_count INTEGER,
  
  -- Status (FK to entity_statuses)
  status_id UUID NOT NULL REFERENCES public.entity_statuses(id) ON DELETE RESTRICT,
  
  -- Account Type
  account_type VARCHAR(50),
  
  -- Address
  billing_street TEXT,
  billing_city VARCHAR(100),
  billing_state VARCHAR(100),
  billing_postal_code VARCHAR(20),
  billing_country VARCHAR(100),
  
  shipping_street TEXT,
  shipping_city VARCHAR(100),
  shipping_state VARCHAR(100),
  shipping_postal_code VARCHAR(20),
  shipping_country VARCHAR(100),
  
  -- Social
  linkedin_url VARCHAR(500),
  twitter_handle VARCHAR(100),
  
  -- Ownership (FK to accounts)
  owner_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  
  -- Origin Tracking (FK to crm_leads)
  created_from_lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  
  -- Hierarchy (FK to parent account)
  parent_account_id UUID REFERENCES public.crm_accounts(id) ON DELETE SET NULL,
  
  -- Customer Metrics
  customer_since TIMESTAMPTZ,
  last_activity_date TIMESTAMPTZ,
  total_revenue DECIMAL(15, 2) DEFAULT 0,
  
  -- Additional Data
  tags JSONB DEFAULT '[]'::jsonb,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  description TEXT,
  
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Soft Delete
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  
  -- Constraints
  CONSTRAINT crm_accounts_name_workspace_unique UNIQUE (workspace_id, account_name)
);

CREATE INDEX IF NOT EXISTS idx_crm_accounts_workspace ON public.crm_accounts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crm_accounts_status ON public.crm_accounts(status_id);
CREATE INDEX IF NOT EXISTS idx_crm_accounts_owner ON public.crm_accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_accounts_parent ON public.crm_accounts(parent_account_id);
CREATE INDEX IF NOT EXISTS idx_crm_accounts_lead_origin ON public.crm_accounts(created_from_lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_accounts_industry ON public.crm_accounts(industry_id);
CREATE INDEX IF NOT EXISTS idx_crm_accounts_not_deleted ON public.crm_accounts(workspace_id, is_deleted) WHERE is_deleted = FALSE;


-- 2. Create CRM Contacts
CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Contact Information
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255),
  email VARCHAR(255),
  phone_number VARCHAR(255),
  mobile_number VARCHAR(255),
  
  -- Alternate Fields (Added)
  alt_email VARCHAR(255),
  alt_phone VARCHAR(255),
  
  job_title VARCHAR(255),
  department VARCHAR(100),
  linkedin_url VARCHAR(500),
  twitter_handle VARCHAR(100),
  
  -- Status (FK to entity_statuses)
  status_id UUID NOT NULL REFERENCES public.entity_statuses(id) ON DELETE RESTRICT,
  
  -- Account Relationship (FK to crm_accounts)
  account_id UUID REFERENCES public.crm_accounts(id) ON DELETE SET NULL,
  
  -- Contact Details
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  reporting_to_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  location VARCHAR(255),
  timezone VARCHAR(100),
  language VARCHAR(50),
  
  -- Communication Preferences
  preferred_contact_method VARCHAR(50),
  do_not_call BOOLEAN NOT NULL DEFAULT FALSE,
  do_not_email BOOLEAN NOT NULL DEFAULT FALSE,
  email_bounced BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Ownership (FK to accounts)
  owner_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  
  -- Origin Tracking (FK to crm_leads)
  created_from_lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  
  -- Additional Data
  tags JSONB DEFAULT '[]'::jsonb,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  
  -- Dates
  last_contact_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Soft Delete
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  
  -- Constraints
  CONSTRAINT crm_contacts_email_workspace_unique UNIQUE (workspace_id, email)
);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_workspace ON public.crm_contacts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_status ON public.crm_contacts(status_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_account ON public.crm_contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_owner ON public.crm_contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_email ON public.crm_contacts(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_contacts_lead_origin ON public.crm_contacts(created_from_lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_not_deleted ON public.crm_contacts(workspace_id, is_deleted) WHERE is_deleted = FALSE;


-- 3. Create CRM Opportunities
CREATE TABLE IF NOT EXISTS public.crm_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Opportunity Information
  opportunity_name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Stage (FK to entity_statuses)
  stage_id UUID NOT NULL REFERENCES public.entity_statuses(id) ON DELETE RESTRICT,
  
  -- Relationships (FKs)
  account_id UUID NOT NULL REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  primary_contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  
  -- Financial Details
  amount DECIMAL(15, 2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  expected_revenue DECIMAL(15, 2) GENERATED ALWAYS AS (amount * probability / 100) STORED,
  
  -- Dates
  expected_close_date DATE,
  actual_close_date DATE,
  
  -- Priority & Type
  priority VARCHAR(50),
  opportunity_type VARCHAR(50),
  
  -- Source
  lead_source VARCHAR(100),
  campaign_id UUID,
  
  -- Ownership (FK to accounts)
  owner_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  
  -- Origin Tracking (FK to crm_leads)
  created_from_lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  
  -- Closure Details
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  is_won BOOLEAN NOT NULL DEFAULT FALSE,
  close_reason TEXT,
  competitor VARCHAR(255),
  
  -- Additional Data
  tags JSONB DEFAULT '[]'::jsonb,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  
  -- Stage History
  stage_history JSONB DEFAULT '[]'::jsonb,
  
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Soft Delete
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_crm_opportunities_workspace ON public.crm_opportunities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_stage ON public.crm_opportunities(stage_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_account ON public.crm_opportunities(account_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_contact ON public.crm_opportunities(primary_contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_owner ON public.crm_opportunities(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_close_date ON public.crm_opportunities(expected_close_date);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_lead_origin ON public.crm_opportunities(created_from_lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_not_deleted ON public.crm_opportunities(workspace_id, is_deleted) WHERE is_deleted = FALSE;


-- Enable RLS (Row Level Security)
ALTER TABLE public.crm_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_opportunities ENABLE ROW LEVEL SECURITY;

-- Create default permissive policies
CREATE POLICY crm_accounts_policy ON public.crm_accounts FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY crm_contacts_policy ON public.crm_contacts FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY crm_opportunities_policy ON public.crm_opportunities FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
