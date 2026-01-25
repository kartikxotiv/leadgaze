/*
 * -------------------------------------------------------
 * Migration: Create Entity Statuses and Leads Tables
 * Date: 2026-02-01
 * Description: Creates database structure for entity statuses and leads management
 * This enables dynamic status management per module and comprehensive lead tracking
 * Focused on Leads module with flexible, scalable status system
 * -------------------------------------------------------
 */

/*
 * -------------------------------------------------------
 * Section: Create ENUM Types
 * Define enumerated types for type safety and validation
 * Only includes enums for leads module
 * -------------------------------------------------------
 */

-- Company size enum
DROP TYPE IF EXISTS public.company_size CASCADE;

CREATE TYPE public.company_size AS ENUM (
  'startup',       -- Startup (1-10)
  'small',         -- Small (11-50)
  'medium',        -- Medium (51-200)
  'large',         -- Large (201-1000)
  'enterprise'     -- Enterprise (1000+)
);

COMMENT ON TYPE public.company_size IS 'Enumerated type for company size categories';

/*
 * -------------------------------------------------------
 * Section: Lead Sources Table
 * Dynamic lead source management for tracking acquisition channels
 * -------------------------------------------------------
 */

CREATE TABLE IF NOT EXISTS public.lead_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Source Identity
  source_name VARCHAR(100) NOT NULL,
  source_key VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Display Properties
  color VARCHAR(7) DEFAULT '#3B82F6',
  icon VARCHAR(50),
  sort_order INTEGER NOT NULL DEFAULT 0,
  
  -- Classification
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Audit Trail
  created_by UUID REFERENCES public.accounts(id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT lead_sources_unique UNIQUE (workspace_id, source_key)
);

-- Enable RLS
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY lead_sources_policy ON public.lead_sources
    FOR ALL
    TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE public.lead_sources IS 'Flexible lead source management - tracks how leads are acquired';
COMMENT ON COLUMN public.lead_sources.source_key IS 'Machine-readable identifier (e.g., direct, website, referral)';
COMMENT ON COLUMN public.lead_sources.is_system IS 'System sources (TRUE) are read-only; user-created sources (FALSE) can be managed from dashboard';

-- Indexes for performance
CREATE INDEX idx_lead_sources_workspace ON public.lead_sources(workspace_id);
CREATE INDEX idx_lead_sources_key ON public.lead_sources(workspace_id, source_key);
CREATE INDEX idx_lead_sources_active ON public.lead_sources(workspace_id) WHERE is_active = TRUE;
CREATE INDEX idx_lead_sources_system ON public.lead_sources(workspace_id) WHERE is_system = TRUE;

-- Permissions
REVOKE ALL ON public.lead_sources FROM authenticated, service_role;
GRANT SELECT ON public.lead_sources TO authenticated, service_role;
GRANT ALL ON public.lead_sources TO service_role,authenticated, anon;

/*
 * -------------------------------------------------------
 * Section: Entity Statuses Table
 * Dynamic status management for all CRM entities
 * -------------------------------------------------------
 */

CREATE TABLE IF NOT EXISTS public.entity_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.crm_modules(id) ON DELETE CASCADE,
  
  -- Status Identity
  status_name VARCHAR(100) NOT NULL,
  status_key VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Display Properties
  color VARCHAR(7) DEFAULT '#3B82F6',
  icon VARCHAR(50),
  sort_order INTEGER NOT NULL DEFAULT 0,
  
  -- Classification (is_system = TRUE means system-defined, FALSE = user-created/customizable)
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,  -- FALSE = hidden from UI but records keep status
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,  -- Terminal state (lead converted, opportunity won, etc.)
  
  -- Future Automation Support
  auto_actions JSONB DEFAULT '[]'::jsonb,
  
  -- Audit Trail (reference accounts table, not auth.users)
  created_by UUID REFERENCES public.accounts(id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT entity_statuses_unique UNIQUE (workspace_id, module_id, status_key)
);

-- Enable RLS
ALTER TABLE public.entity_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY entity_statuses_policy ON public.entity_statuses
    FOR ALL
    TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE public.entity_statuses IS 'Flexible status system for all CRM modules - supports user-created custom statuses per workspace/module';
COMMENT ON COLUMN public.entity_statuses.status_key IS 'Machine-readable identifier (e.g., new, qualified, converted) - must be unique per module/workspace';
COMMENT ON COLUMN public.entity_statuses.is_system IS 'System statuses (TRUE) are read-only; user-created statuses (FALSE) can be managed from dashboard';
COMMENT ON COLUMN public.entity_statuses.is_closed IS 'Marks terminal states (converted, lost, won) - workflow logic uses this for decision points';
COMMENT ON COLUMN public.entity_statuses.auto_actions IS 'JSON array for future automation engine (e.g., send email, create task, assign user)';

-- Indexes for performance
CREATE INDEX idx_entity_statuses_workspace ON public.entity_statuses(workspace_id);
CREATE INDEX idx_entity_statuses_module ON public.entity_statuses(module_id);
CREATE INDEX idx_entity_statuses_key ON public.entity_statuses(workspace_id, module_id, status_key);
CREATE INDEX idx_entity_statuses_active ON public.entity_statuses(workspace_id, module_id) WHERE is_active = TRUE;
CREATE UNIQUE INDEX idx_entity_statuses_one_default ON public.entity_statuses(workspace_id, module_id) WHERE is_default = TRUE;
CREATE INDEX idx_entity_statuses_system ON public.entity_statuses(workspace_id, module_id) WHERE is_system = TRUE;

-- Permissions
REVOKE ALL ON public.entity_statuses FROM authenticated, service_role;
GRANT SELECT ON public.entity_statuses TO authenticated, service_role;
GRANT ALL ON public.entity_statuses TO service_role, authenticated, anon;

/*
 * -------------------------------------------------------
 * Section: CRM Leads Table
 * Main leads entity with comprehensive tracking
 * Focused on leads management with flexible status system
 * -------------------------------------------------------
 */

CREATE TABLE IF NOT EXISTS public.crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Personal Information
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255),
  email VARCHAR(255),
  alt_email VARCHAR(255),
  phone_number VARCHAR(255),
  mobile_number VARCHAR(255),
  linkedin_url VARCHAR(500),
  
  -- Company Information
  company_name VARCHAR(255),
  company_website VARCHAR(500),
  company_linkedin_url VARCHAR(500),
  job_title VARCHAR(255),
  department VARCHAR(100),
  industry VARCHAR(100),
  company_size public.company_size,
  annual_revenue DECIMAL(15, 2),
  
  -- Location & Contact Info
  location VARCHAR(255),
  timezone VARCHAR(100),
  
  -- Lead Status & Classification
  status_id UUID NOT NULL REFERENCES public.entity_statuses(id) ON DELETE RESTRICT,
  source_id UUID REFERENCES public.lead_sources(id) ON DELETE SET NULL,
  trigger VARCHAR(255),
  
  -- Lead Scoring
  lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
  
  -- Ownership & Tracking (reference accounts table, not auth.users)
  owner_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  
  -- Visibility Control
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Communication Tracking
  last_contact_date TIMESTAMPTZ,
  next_followup_date TIMESTAMPTZ,
  contacted_count INTEGER NOT NULL DEFAULT 0,
  
  -- Additional Data (extensible for future needs)
  tags JSONB DEFAULT '[]'::jsonb,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Soft Delete with Audit Trail
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_leads_policy ON public.crm_leads
    FOR ALL
    TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);



-- Policy: All mutations allowed to service_role (backend operations)
CREATE POLICY crm_leads_all_mutations ON public.crm_leads
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE public.crm_leads IS 'Lead records - potential prospects and customers in various workflow stages';
COMMENT ON COLUMN public.crm_leads.status_id IS 'References flexible entity_statuses table for customizable lead workflow';
COMMENT ON COLUMN public.crm_leads.source_id IS 'References lead_sources table for flexible acquisition channel tracking';
COMMENT ON COLUMN public.crm_leads.lead_score IS 'Numeric score indicating lead quality (0-100) for prioritization';
COMMENT ON COLUMN public.crm_leads.owner_id IS 'Account (team member) who owns this lead - for assignment and permissions';
COMMENT ON COLUMN public.crm_leads.alt_email IS 'Alternative email address for the lead';
COMMENT ON COLUMN public.crm_leads.company_linkedin_url IS 'LinkedIn page URL for the company';
COMMENT ON COLUMN public.crm_leads.company_website IS 'Official website URL for the company';
COMMENT ON COLUMN public.crm_leads.trigger IS 'Trigger or reason that brought the lead to attention';
COMMENT ON COLUMN public.crm_leads.tags IS 'JSON array of tag strings for flexible categorization';
COMMENT ON COLUMN public.crm_leads.custom_fields IS 'JSON object for storing custom field values without schema changes';
COMMENT ON COLUMN public.crm_leads.is_public IS 'If TRUE, visible to all workspace members; if FALSE, visible only to owner and assignees';

-- Indexes for performance
CREATE INDEX idx_crm_leads_workspace ON public.crm_leads(workspace_id);
CREATE INDEX idx_crm_leads_status ON public.crm_leads(status_id);
CREATE INDEX idx_crm_leads_source ON public.crm_leads(source_id);
CREATE INDEX idx_crm_leads_owner ON public.crm_leads(owner_id);
CREATE INDEX idx_crm_leads_email ON public.crm_leads(email) WHERE email IS NOT NULL;
CREATE INDEX idx_crm_leads_alt_email ON public.crm_leads(alt_email) WHERE alt_email IS NOT NULL;
CREATE INDEX idx_crm_leads_not_deleted ON public.crm_leads(workspace_id, is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX idx_crm_leads_score ON public.crm_leads(workspace_id, lead_score DESC);
CREATE INDEX idx_crm_leads_followup ON public.crm_leads(workspace_id, next_followup_date) 
  WHERE is_deleted = FALSE;
CREATE INDEX idx_crm_leads_company ON public.crm_leads(workspace_id, company_name) WHERE company_name IS NOT NULL;
CREATE INDEX idx_crm_leads_visibility ON public.crm_leads(workspace_id, is_public) WHERE is_deleted = FALSE;
CREATE UNIQUE INDEX idx_crm_leads_email_unique ON public.crm_leads(workspace_id, email) WHERE email IS NOT NULL AND is_deleted = FALSE;

-- Permissions
REVOKE ALL ON public.crm_leads FROM authenticated, service_role;
GRANT SELECT ON public.crm_leads TO authenticated, service_role;
GRANT ALL ON public.crm_leads TO service_role, authenticated, anon;

/*
 * -------------------------------------------------------
 * Section: Seed Default Entity Statuses for Leads
 * -------------------------------------------------------
 */

-- Get lead module ID for seeding
INSERT INTO public.entity_statuses (workspace_id, module_id, status_name, status_key, color, icon, sort_order, is_system, is_active, is_default, created_by)
SELECT 
  w.id,
  (SELECT id FROM public.crm_modules WHERE module_key = 'leads'),
  'New',
  'new',
  '#3B82F6',
  'star',
  0,
  TRUE,
  TRUE,
  TRUE,
  NULL
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.entity_statuses es 
  WHERE es.workspace_id = w.id 
  AND es.status_key = 'new'
  AND es.module_id = (SELECT id FROM public.crm_modules WHERE module_key = 'leads')
);

INSERT INTO public.entity_statuses (workspace_id, module_id, status_name, status_key, color, icon, sort_order, is_system, is_active, is_default, created_by)
SELECT 
  w.id,
  (SELECT id FROM public.crm_modules WHERE module_key = 'leads'),
  'Qualified',
  'qualified',
  '#10B981',
  'check-circle',
  1,
  TRUE,
  TRUE,
  FALSE,
  NULL
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.entity_statuses es 
  WHERE es.workspace_id = w.id 
  AND es.status_key = 'qualified'
  AND es.module_id = (SELECT id FROM public.crm_modules WHERE module_key = 'leads')
);

INSERT INTO public.entity_statuses (workspace_id, module_id, status_name, status_key, color, icon, sort_order, is_system, is_active, is_default, created_by)
SELECT 
  w.id,
  (SELECT id FROM public.crm_modules WHERE module_key = 'leads'),
  'Contacted',
  'contacted',
  '#60A5FA',
  'message-circle',
  1,
  TRUE,
  TRUE,
  FALSE,
  NULL
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.entity_statuses es 
  WHERE es.workspace_id = w.id 
  AND es.status_key = 'contacted'
  AND es.module_id = (SELECT id FROM public.crm_modules WHERE module_key = 'leads')
);

INSERT INTO public.entity_statuses (workspace_id, module_id, status_name, status_key, color, icon, sort_order, is_system, is_active, is_default, created_by)
SELECT 
  w.id,
  (SELECT id FROM public.crm_modules WHERE module_key = 'leads'),
  'Nurturing',
  'nurturing',
  '#F59E0B',
  'heart',
  2,
  TRUE,
  TRUE,
  FALSE,
  NULL
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.entity_statuses es 
  WHERE es.workspace_id = w.id 
  AND es.status_key = 'nurturing'
  AND es.module_id = (SELECT id FROM public.crm_modules WHERE module_key = 'leads')
);

INSERT INTO public.entity_statuses (workspace_id, module_id, status_name, status_key, color, icon, sort_order, is_system, is_active, is_default, is_closed, created_by)
SELECT 
  w.id,
  (SELECT id FROM public.crm_modules WHERE module_key = 'leads'),
  'Unqualified',
  'unqualified',
  '#EF4444',
  'x-circle',
  4,
  TRUE,
  TRUE,
  FALSE,
  TRUE,
  NULL
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.entity_statuses es 
  WHERE es.workspace_id = w.id 
  AND es.status_key = 'unqualified'
  AND es.module_id = (SELECT id FROM public.crm_modules WHERE module_key = 'leads')
);

/*
 * -------------------------------------------------------
 * Section: Seed Default Lead Sources
 * -------------------------------------------------------
 */

INSERT INTO public.lead_sources (workspace_id, source_name, source_key, color, icon, sort_order, is_system, is_active, created_by)
SELECT 
  w.id,
  'Direct',
  'direct',
  '#3B82F6',
  'user',
  0,
  TRUE,
  TRUE,
  NULL
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.lead_sources ls 
  WHERE ls.workspace_id = w.id 
  AND ls.source_key = 'direct'
);

INSERT INTO public.lead_sources (workspace_id, source_name, source_key, color, icon, sort_order, is_system, is_active, created_by)
SELECT 
  w.id,
  'Website',
  'website',
  '#60A5FA',
  'globe',
  1,
  TRUE,
  TRUE,
  NULL
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.lead_sources ls 
  WHERE ls.workspace_id = w.id 
  AND ls.source_key = 'website'
);

INSERT INTO public.lead_sources (workspace_id, source_name, source_key, color, icon, sort_order, is_system, is_active, created_by)
SELECT 
  w.id,
  'Phone',
  'phone',
  '#34D399',
  'phone',
  2,
  TRUE,
  TRUE,
  NULL
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.lead_sources ls 
  WHERE ls.workspace_id = w.id 
  AND ls.source_key = 'phone'
);

INSERT INTO public.lead_sources (workspace_id, source_name, source_key, color, icon, sort_order, is_system, is_active, created_by)
SELECT 
  w.id,
  'Email',
  'email',
  '#F59E0B',
  'mail',
  3,
  TRUE,
  TRUE,
  NULL
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.lead_sources ls 
  WHERE ls.workspace_id = w.id 
  AND ls.source_key = 'email'
);

INSERT INTO public.lead_sources (workspace_id, source_name, source_key, color, icon, sort_order, is_system, is_active, created_by)
SELECT 
  w.id,
  'Referral',
  'referral',
  '#8B5CF6',
  'share-2',
  4,
  TRUE,
  TRUE,
  NULL
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.lead_sources ls 
  WHERE ls.workspace_id = w.id 
  AND ls.source_key = 'referral'
);

INSERT INTO public.lead_sources (workspace_id, source_name, source_key, color, icon, sort_order, is_system, is_active, created_by)
SELECT 
  w.id,
  'Social Media',
  'social_media',
  '#EC4899',
  'share',
  5,
  TRUE,
  TRUE,
  NULL
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.lead_sources ls 
  WHERE ls.workspace_id = w.id 
  AND ls.source_key = 'social_media'
);

INSERT INTO public.lead_sources (workspace_id, source_name, source_key, color, icon, sort_order, is_system, is_active, created_by)
SELECT 
  w.id,
  'Event',
  'event',
  '#06B6D4',
  'calendar',
  6,
  TRUE,
  TRUE,
  NULL
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.lead_sources ls 
  WHERE ls.workspace_id = w.id 
  AND ls.source_key = 'event'
);

INSERT INTO public.lead_sources (workspace_id, source_name, source_key, color, icon, sort_order, is_system, is_active, created_by)
SELECT 
  w.id,
  'Advertisement',
  'advertisement',
  '#EF4444',
  'megaphone',
  7,
  TRUE,
  TRUE,
  NULL
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.lead_sources ls 
  WHERE ls.workspace_id = w.id 
  AND ls.source_key = 'advertisement'
);

INSERT INTO public.lead_sources (workspace_id, source_name, source_key, color, icon, sort_order, is_system, is_active, created_by)
SELECT 
  w.id,
  'Partner',
  'partner',
  '#06B6D4',
  'link',
  8,
  TRUE,
  TRUE,
  NULL
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.lead_sources ls 
  WHERE ls.workspace_id = w.id 
  AND ls.source_key = 'partner'
);

INSERT INTO public.lead_sources (workspace_id, source_name, source_key, color, icon, sort_order, is_system, is_active, created_by)
SELECT 
  w.id,
  'Other',
  'other',
  '#6B7280',
  'help-circle',
  9,
  TRUE,
  TRUE,
  NULL
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.lead_sources ls 
  WHERE ls.workspace_id = w.id 
  AND ls.source_key = 'other'
);

/*
 * -------------------------------------------------------
 * Section: Trigger for Workspace Initialization
 * Auto-seed defaults when a new workspace is created
 * -------------------------------------------------------
 */

CREATE OR REPLACE FUNCTION public.seed_workspace_defaults()
RETURNS TRIGGER AS $$
DECLARE
  v_leads_module_id UUID;
BEGIN
  -- Get the leads module ID
  SELECT id INTO v_leads_module_id
  FROM public.crm_modules
  WHERE module_key = 'leads'
  LIMIT 1;

  -- Only proceed if leads module exists
  IF v_leads_module_id IS NOT NULL THEN
    -- Seed default lead statuses
    INSERT INTO public.entity_statuses (
      workspace_id, module_id, status_name, status_key, color, icon, 
      sort_order, is_system, is_active, is_default, is_closed, created_by
    ) VALUES
      (NEW.id, v_leads_module_id, 'New', 'new', '#3B82F6', 'star', 0, TRUE, TRUE, TRUE, FALSE, NULL),
      (NEW.id, v_leads_module_id, 'Contacted', 'contacted', '#60A5FA', 'message-circle', 1, TRUE, TRUE, FALSE, FALSE, NULL),
      (NEW.id, v_leads_module_id, 'Nurturing', 'nurturing', '#F59E0B', 'heart', 2, TRUE, TRUE, FALSE, FALSE, NULL),
      (NEW.id, v_leads_module_id, 'Qualified', 'qualified', '#10B981', 'check-circle', 3, TRUE, TRUE, FALSE, FALSE, NULL),
      (NEW.id, v_leads_module_id, 'Unqualified', 'unqualified', '#EF4444', 'x-circle', 4, TRUE, TRUE, FALSE, TRUE, NULL)
    ON CONFLICT DO NOTHING;

    -- Seed default lead sources
    INSERT INTO public.lead_sources (
      workspace_id, source_name, source_key, color, icon, sort_order, is_system, is_active, created_by
    ) VALUES
      (NEW.id, 'Direct', 'direct', '#3B82F6', 'user', 0, TRUE, TRUE, NULL),
      (NEW.id, 'Website', 'website', '#60A5FA', 'globe', 1, TRUE, TRUE, NULL),
      (NEW.id, 'Phone', 'phone', '#34D399', 'phone', 2, TRUE, TRUE, NULL),
      (NEW.id, 'Email', 'email', '#F59E0B', 'mail', 3, TRUE, TRUE, NULL),
      (NEW.id, 'Referral', 'referral', '#8B5CF6', 'share-2', 4, TRUE, TRUE, NULL),
      (NEW.id, 'Social Media', 'social_media', '#EC4899', 'share', 5, TRUE, TRUE, NULL),
      (NEW.id, 'Event', 'event', '#06B6D4', 'calendar', 6, TRUE, TRUE, NULL),
      (NEW.id, 'Advertisement', 'advertisement', '#EF4444', 'megaphone', 7, TRUE, TRUE, NULL),
      (NEW.id, 'Partner', 'partner', '#06B6D4', 'link', 8, TRUE, TRUE, NULL),
      (NEW.id, 'Other', 'other', '#6B7280', 'help-circle', 9, TRUE, TRUE, NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on workspace insertion
DROP TRIGGER IF EXISTS trg_seed_workspace_defaults ON public.workspaces;
CREATE TRIGGER trg_seed_workspace_defaults
AFTER INSERT ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.seed_workspace_defaults();

COMMENT ON FUNCTION public.seed_workspace_defaults() IS 'Automatically seeds default lead statuses and sources when a new workspace is created';
