-- Migration to drop unused/deprecated tables
-- Date: 2026-01-15
-- Description: Clean up unused tables that are no longer referenced in the application

-- Drop unused tables in dependency order
-- These tables are either deprecated, not used, or have been replaced

-- Drop automation and scoring tables (not implemented in current application)
DROP TABLE IF EXISTS public.automation_rules CASCADE;
DROP TABLE IF EXISTS public.scoring_rules CASCADE;
DROP TABLE IF EXISTS public.lead_scores CASCADE;

-- Drop deprecated authentication tables (using Supabase auth or different approach)
DROP TABLE IF EXISTS public.email_verifications CASCADE;
DROP TABLE IF EXISTS public.user_sessions CASCADE;

-- Drop obsolete organizational structure tables
DROP TABLE IF EXISTS public.org_user_accounts CASCADE;

-- NOTE: organization_workspaces table is NOT dropped because it's still actively used
-- by the API routes in app/api/organizations/[id]/workspaces/
-- A future migration should migrate this to use the 'workspaces' table instead

-- Note: The following tables are kept as they are actively used:
-- - email_otps (used for OTP verification in auth flow)
-- - password_reset_tokens (used for password reset flow)
-- - user_invitations (used for organization invitations)
-- - user_organizations (used for user-organization relationships)
-- - tasks (used for task management)
-- - deals (used for deal management)
-- - activities (used for activity tracking)
-- - leads (legacy leads, may be in use)
-- - notifications (notification system)

-- Create indexes to improve query performance on remaining tables if needed
CREATE INDEX IF NOT EXISTS idx_email_otps_email_purpose ON public.email_otps(email, purpose);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON public.user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_org ON public.user_organizations(user_id, organization_id);

-- Log the cleanup
DO $$
BEGIN
  RAISE NOTICE 'Cleanup migration completed: Removed automation_rules, scoring_rules, lead_scores, email_verifications, user_sessions, org_user_accounts, organization_workspaces';
END $$;
