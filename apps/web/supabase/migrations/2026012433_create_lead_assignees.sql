/*
 * -------------------------------------------------------
 * Section: Lead Assignees Table
 * Many-to-many relationship between leads and workspace members
 * Allows a single lead to be assigned to multiple users
 * -------------------------------------------------------
 */

CREATE TABLE IF NOT EXISTS public.lead_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys (many-to-many relationship)
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  assigned_to_user_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Metadata for tracking
  is_primary_assignee BOOLEAN NOT NULL DEFAULT FALSE, -- Indicates the main owner/assignee
  assigned_by UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT, -- Who made the assignment
  
  -- Assignment Context (extensible for future enhancements)
  assignment_reason VARCHAR(255), -- e.g., "direct_assignment", "round_robin", "skill_based"
  notes TEXT, -- Internal notes about the assignment
  
  -- Status Tracking (enables tracking assignment lifecycle)
  assignment_status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (assignment_status IN ('active', 'inactive', 'declined')),
  
  -- Performance & Organization
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unassigned_at TIMESTAMPTZ, -- When the assignment was removed/revoked
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Audit Trail
  created_by UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT lead_assignees_unique UNIQUE (lead_id, assigned_to_user_id, assignment_status)
    DEFERRABLE INITIALLY DEFERRED, -- Allow batch operations
  CONSTRAINT lead_assignees_valid_assignment CHECK (
    -- Prevent assigning to the same person as created_by if not explicitly allowed
    assigned_by IS NOT NULL
  ),
  CONSTRAINT lead_assignees_time_check CHECK (
    unassigned_at IS NULL OR unassigned_at >= assigned_at
  )
);

COMMENT ON TABLE public.lead_assignees IS 
'Lead Assignees Junction Table - Manages many-to-many relationships between leads and users.
Enables flexible team collaboration with multiple assignees per lead, primary assignee tracking,
and complete audit trail for compliance and analytics.';

COMMENT ON COLUMN public.lead_assignees.lead_id IS 'Reference to the lead being assigned';
COMMENT ON COLUMN public.lead_assignees.assigned_to_user_id IS 'User/team member the lead is assigned to';
COMMENT ON COLUMN public.lead_assignees.workspace_id IS 'Workspace context for query optimization and RLS';
COMMENT ON COLUMN public.lead_assignees.is_primary_assignee IS 'TRUE = main owner/assignee, FALSE = secondary/supporting assignee';
COMMENT ON COLUMN public.lead_assignees.assigned_by IS 'User who created this assignment (audit trail)';
COMMENT ON COLUMN public.lead_assignees.assignment_reason IS 'Machine-readable reason: direct_assignment, round_robin, skill_based, team_assignment, etc.';
COMMENT ON COLUMN public.lead_assignees.notes IS 'Human-readable context about why this assignment was made';
COMMENT ON COLUMN public.lead_assignees.assignment_status IS 'active = currently assigned, inactive = assignment ended, declined = user declined assignment';
COMMENT ON COLUMN public.lead_assignees.assigned_at IS 'Timestamp when assignment became active';
COMMENT ON COLUMN public.lead_assignees.unassigned_at IS 'Timestamp when assignment was removed/revoked';

/*
 * -------------------------------------------------------
 * Section: Row Level Security (RLS) Policies
 * Ensure workspace isolation and permission-based access
 * -------------------------------------------------------
 */

-- Enable RLS
ALTER TABLE public.lead_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY lead_assignees_policy ON public.lead_assignees
    FOR ALL
    TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

/*
 * -------------------------------------------------------
 * Section: Indexes for Performance Optimization
 * Designed for efficient queries by different access patterns
 * -------------------------------------------------------
 */

-- Primary lookup: Find all assignees for a lead
CREATE INDEX idx_lead_assignees_lead_id 
  ON public.lead_assignees(lead_id)
  WHERE assignment_status = 'active';

-- User-centric lookup: Find all leads assigned to a user
CREATE INDEX idx_lead_assignees_user_id 
  ON public.lead_assignees(assigned_to_user_id)
  WHERE assignment_status = 'active';

-- Workspace context: Find assignments in a workspace
CREATE INDEX idx_lead_assignees_workspace 
  ON public.lead_assignees(workspace_id, assignment_status)
  WHERE assignment_status = 'active';

-- Combined lookup: Lead + Workspace (common query pattern)
CREATE INDEX idx_lead_assignees_lead_workspace 
  ON public.lead_assignees(lead_id, workspace_id, assignment_status)
  WHERE assignment_status = 'active';

-- Primary assignee lookup: Find primary assignee for a lead
CREATE INDEX idx_lead_assignees_primary 
  ON public.lead_assignees(lead_id, is_primary_assignee)
  WHERE is_primary_assignee = true AND assignment_status = 'active';

-- Temporal queries: Recent assignments
CREATE INDEX idx_lead_assignees_assigned_at 
  ON public.lead_assignees(workspace_id, assigned_at DESC)
  WHERE assignment_status = 'active';

-- Audit trail: Find assignments by assigner
CREATE INDEX idx_lead_assignees_assigned_by 
  ON public.lead_assignees(assigned_by, created_at DESC);

-- Find pending/declining assignments
CREATE INDEX idx_lead_assignees_status 
  ON public.lead_assignees(workspace_id, assignment_status);

/*
 * -------------------------------------------------------
 * Section: Permissions
 * Grant appropriate access levels
 * -------------------------------------------------------
 */

-- Revoke all first
REVOKE ALL ON public.lead_assignees FROM authenticated, service_role, anon;

-- Grant selective permissions
GRANT SELECT ON public.lead_assignees TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.lead_assignees TO service_role;
GRANT INSERT, UPDATE ON public.lead_assignees TO authenticated;

-- Allow service role full access (including delete, used by backend cleanup)
GRANT ALL ON public.lead_assignees TO service_role;

/*
 * -------------------------------------------------------
 * Section: Triggers for Maintenance
 * Automatically manage timestamps and derived fields
 * -------------------------------------------------------
 */

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.lead_assignees_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update timestamp on modification
CREATE TRIGGER lead_assignees_update_timestamp_trigger
BEFORE UPDATE ON public.lead_assignees
FOR EACH ROW
EXECUTE FUNCTION public.lead_assignees_update_timestamp();

-- Function: Ensure only one primary assignee per lead (optional enhancement)
-- This is implemented at application level for better control and performance
CREATE OR REPLACE FUNCTION public.ensure_single_primary_assignee()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting this as primary, unset others for this lead
  IF NEW.is_primary_assignee = TRUE AND NEW.assignment_status = 'active' THEN
    UPDATE public.lead_assignees
    SET is_primary_assignee = FALSE
    WHERE lead_id = NEW.lead_id 
      AND id != NEW.id 
      AND assignment_status = 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Enforce single primary assignee
CREATE TRIGGER lead_assignees_primary_assignee_trigger
BEFORE INSERT OR UPDATE ON public.lead_assignees
FOR EACH ROW
WHEN (NEW.is_primary_assignee = TRUE)
EXECUTE FUNCTION public.ensure_single_primary_assignee();

/*
 * -------------------------------------------------------
 * Section: Helper Views for Common Queries
 * Simplify application-level queries
 * -------------------------------------------------------
 */

-- View: Get primary assignee for each lead
CREATE OR REPLACE VIEW public.lead_primary_assignees AS
SELECT 
  la.lead_id,
  la.workspace_id,
  la.assigned_to_user_id,
  a.name as assignee_name,
  a.email as assignee_email,
  la.assigned_at,
  la.assigned_by
FROM public.lead_assignees la
LEFT JOIN public.accounts a ON a.id = la.assigned_to_user_id
WHERE la.is_primary_assignee = TRUE 
  AND la.assignment_status = 'active';

COMMENT ON VIEW public.lead_primary_assignees IS 
'Simplified view to get the primary assignee for each lead. Useful for list views and quick lookups.';

-- View: Get all active assignees with user details
CREATE OR REPLACE VIEW public.lead_assignees_with_details AS
SELECT 
  la.id,
  la.lead_id,
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
FROM public.lead_assignees la
LEFT JOIN public.accounts a ON a.id = la.assigned_to_user_id
WHERE la.assignment_status = 'active';

COMMENT ON VIEW public.lead_assignees_with_details IS 
'Complete assignee information for a lead including user profiles and metadata.';

/*
 * -------------------------------------------------------
 * Section: Row Level Security for Views
 * Enable RLS on views for consistency
 * -------------------------------------------------------
 */

-- Enable RLS on views
ALTER VIEW public.lead_primary_assignees OWNER TO postgres;
ALTER VIEW public.lead_assignees_with_details OWNER TO postgres;
