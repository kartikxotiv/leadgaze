/*
 * -------------------------------------------------------
 * Migration: Create Assignees Tables for Accounts, Contacts, and Opportunities
 * Date: 2026-01-29
 * Description: Creates assignee tables for accounts, contacts, and opportunities
 *              following the same pattern as lead_assignees
 * -------------------------------------------------------
 */

-- =====================================================
-- Account Assignees Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.account_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys (many-to-many relationship)
  account_id UUID NOT NULL REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  assigned_to_user_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Metadata for tracking
  is_primary_assignee BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_by UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  
  -- Assignment Context
  assignment_reason VARCHAR(255),
  notes TEXT,
  
  -- Status Tracking
  assignment_status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (assignment_status IN ('active', 'inactive', 'declined')),
  
  -- Performance & Organization
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unassigned_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Audit Trail
  created_by UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT account_assignees_unique UNIQUE (account_id, assigned_to_user_id, assignment_status)
    DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT account_assignees_time_check CHECK (
    unassigned_at IS NULL OR unassigned_at >= assigned_at
  )
);

COMMENT ON TABLE public.account_assignees IS 
'Account Assignees Junction Table - Manages many-to-many relationships between accounts and users.';

-- Enable RLS
ALTER TABLE public.account_assignees ENABLE ROW LEVEL SECURITY;
CREATE POLICY account_assignees_policy ON public.account_assignees
    FOR ALL
    TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

-- Indexes
CREATE INDEX idx_account_assignees_account_id 
  ON public.account_assignees(account_id)
  WHERE assignment_status = 'active';
CREATE INDEX idx_account_assignees_user_id 
  ON public.account_assignees(assigned_to_user_id)
  WHERE assignment_status = 'active';
CREATE INDEX idx_account_assignees_workspace 
  ON public.account_assignees(workspace_id, assignment_status)
  WHERE assignment_status = 'active';
CREATE INDEX idx_account_assignees_primary 
  ON public.account_assignees(account_id, is_primary_assignee)
  WHERE is_primary_assignee = true AND assignment_status = 'active';

-- View: Get all active assignees with user details
CREATE OR REPLACE VIEW public.account_assignees_with_details AS
SELECT 
  la.id,
  la.account_id,
  la.workspace_id,
  la.assigned_to_user_id,
  a.name as assignee_name,
  a.email as assignee_email,
  a.picture_url as assignee_picture,
  la.is_primary_assignee,
  la.assigned_at,
  la.assignment_reason,
  la.assignment_status,
  la.notes
FROM public.account_assignees la
LEFT JOIN public.accounts a ON a.id = la.assigned_to_user_id
WHERE la.assignment_status = 'active';

-- =====================================================
-- Contact Assignees Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.contact_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys (many-to-many relationship)
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  assigned_to_user_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Metadata for tracking
  is_primary_assignee BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_by UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  
  -- Assignment Context
  assignment_reason VARCHAR(255),
  notes TEXT,
  
  -- Status Tracking
  assignment_status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (assignment_status IN ('active', 'inactive', 'declined')),
  
  -- Performance & Organization
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unassigned_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Audit Trail
  created_by UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT contact_assignees_unique UNIQUE (contact_id, assigned_to_user_id, assignment_status)
    DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT contact_assignees_time_check CHECK (
    unassigned_at IS NULL OR unassigned_at >= assigned_at
  )
);

COMMENT ON TABLE public.contact_assignees IS 
'Contact Assignees Junction Table - Manages many-to-many relationships between contacts and users.';

-- Enable RLS
ALTER TABLE public.contact_assignees ENABLE ROW LEVEL SECURITY;
CREATE POLICY contact_assignees_policy ON public.contact_assignees
    FOR ALL
    TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

-- Indexes
CREATE INDEX idx_contact_assignees_contact_id 
  ON public.contact_assignees(contact_id)
  WHERE assignment_status = 'active';
CREATE INDEX idx_contact_assignees_user_id 
  ON public.contact_assignees(assigned_to_user_id)
  WHERE assignment_status = 'active';
CREATE INDEX idx_contact_assignees_workspace 
  ON public.contact_assignees(workspace_id, assignment_status)
  WHERE assignment_status = 'active';
CREATE INDEX idx_contact_assignees_primary 
  ON public.contact_assignees(contact_id, is_primary_assignee)
  WHERE is_primary_assignee = true AND assignment_status = 'active';

-- View: Get all active assignees with user details
CREATE OR REPLACE VIEW public.contact_assignees_with_details AS
SELECT 
  la.id,
  la.contact_id,
  la.workspace_id,
  la.assigned_to_user_id,
  a.name as assignee_name,
  a.email as assignee_email,
  a.picture_url as assignee_picture,
  la.is_primary_assignee,
  la.assigned_at,
  la.assignment_reason,
  la.assignment_status,
  la.notes
FROM public.contact_assignees la
LEFT JOIN public.accounts a ON a.id = la.assigned_to_user_id
WHERE la.assignment_status = 'active';

-- =====================================================
-- Opportunity Assignees Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.opportunity_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys (many-to-many relationship)
  opportunity_id UUID NOT NULL REFERENCES public.crm_opportunities(id) ON DELETE CASCADE,
  assigned_to_user_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Metadata for tracking
  is_primary_assignee BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_by UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  
  -- Assignment Context
  assignment_reason VARCHAR(255),
  notes TEXT,
  
  -- Status Tracking
  assignment_status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (assignment_status IN ('active', 'inactive', 'declined')),
  
  -- Performance & Organization
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unassigned_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Audit Trail
  created_by UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT opportunity_assignees_unique UNIQUE (opportunity_id, assigned_to_user_id, assignment_status)
    DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT opportunity_assignees_time_check CHECK (
    unassigned_at IS NULL OR unassigned_at >= assigned_at
  )
);

COMMENT ON TABLE public.opportunity_assignees IS 
'Opportunity Assignees Junction Table - Manages many-to-many relationships between opportunities and users.';

-- Enable RLS
ALTER TABLE public.opportunity_assignees ENABLE ROW LEVEL SECURITY;
CREATE POLICY opportunity_assignees_policy ON public.opportunity_assignees
    FOR ALL
    TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

-- Indexes
CREATE INDEX idx_opportunity_assignees_opportunity_id 
  ON public.opportunity_assignees(opportunity_id)
  WHERE assignment_status = 'active';
CREATE INDEX idx_opportunity_assignees_user_id 
  ON public.opportunity_assignees(assigned_to_user_id)
  WHERE assignment_status = 'active';
CREATE INDEX idx_opportunity_assignees_workspace 
  ON public.opportunity_assignees(workspace_id, assignment_status)
  WHERE assignment_status = 'active';
CREATE INDEX idx_opportunity_assignees_primary 
  ON public.opportunity_assignees(opportunity_id, is_primary_assignee)
  WHERE is_primary_assignee = true AND assignment_status = 'active';

-- View: Get all active assignees with user details
CREATE OR REPLACE VIEW public.opportunity_assignees_with_details AS
SELECT 
  la.id,
  la.opportunity_id,
  la.workspace_id,
  la.assigned_to_user_id,
  a.name as assignee_name,
  a.email as assignee_email,
  a.picture_url as assignee_picture,
  la.is_primary_assignee,
  la.assigned_at,
  la.assignment_reason,
  la.assignment_status,
  la.notes
FROM public.opportunity_assignees la
LEFT JOIN public.accounts a ON a.id = la.assigned_to_user_id
WHERE la.assignment_status = 'active';

-- Permissions
REVOKE ALL ON public.account_assignees FROM authenticated, service_role, anon;
GRANT SELECT ON public.account_assignees TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.account_assignees TO service_role;
GRANT INSERT, UPDATE ON public.account_assignees TO authenticated;

REVOKE ALL ON public.contact_assignees FROM authenticated, service_role, anon;
GRANT SELECT ON public.contact_assignees TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.contact_assignees TO service_role;
GRANT INSERT, UPDATE ON public.contact_assignees TO authenticated;

REVOKE ALL ON public.opportunity_assignees FROM authenticated, service_role, anon;
GRANT SELECT ON public.opportunity_assignees TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.opportunity_assignees TO service_role;
GRANT INSERT, UPDATE ON public.opportunity_assignees TO authenticated;

GRANT ALL ON public.account_assignees TO service_role;
GRANT ALL ON public.contact_assignees TO service_role;
GRANT ALL ON public.opportunity_assignees TO service_role;
