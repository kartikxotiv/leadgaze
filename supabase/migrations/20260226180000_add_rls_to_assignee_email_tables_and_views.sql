/*
 * Migration: Add RLS to Assignee/Email Tables and Secure Related Views
 * Date: 2026-02-26
 * Description: Enables RLS and applies broad policies to selected tables,
 *              and marks related views as security_invoker so base-table RLS is enforced.
 */

-- =====================================================
-- Tables: Enable RLS
-- =====================================================

ALTER TABLE IF EXISTS public.account_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contact_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workspace_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workspace_members ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Tables: Policies (drop/recreate for idempotency)
-- =====================================================

DROP POLICY IF EXISTS account_assignees_policy ON public.account_assignees;
CREATE POLICY account_assignees_policy ON public.account_assignees
  FOR ALL
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS contact_assignees_policy ON public.contact_assignees;
CREATE POLICY contact_assignees_policy ON public.contact_assignees
  FOR ALL
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS email_accounts_policy ON public.email_accounts;
CREATE POLICY email_accounts_policy ON public.email_accounts
  FOR ALL
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS email_sends_policy ON public.email_sends;
CREATE POLICY email_sends_policy ON public.email_sends
  FOR ALL
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS emails_policy ON public.emails;
CREATE POLICY emails_policy ON public.emails
  FOR ALL
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS workspace_email_templates_policy ON public.workspace_email_templates;
CREATE POLICY workspace_email_templates_policy ON public.workspace_email_templates
  FOR ALL
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS workspace_members_policy ON public.workspace_members;
CREATE POLICY workspace_members_policy ON public.workspace_members
  FOR ALL
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- Views: Ensure invoker security to honor base table RLS
-- =====================================================

ALTER VIEW IF EXISTS public.lead_primary_assignees
  SET (security_invoker = true);

ALTER VIEW IF EXISTS public.lead_assignees_with_details
  SET (security_invoker = true);

ALTER VIEW IF EXISTS public.opportunity_assignees_with_details
  SET (security_invoker = true);

-- Handle alternate/singular names if present
ALTER VIEW IF EXISTS public.lead_assignees_with_detail
  SET (security_invoker = true);

ALTER VIEW IF EXISTS public.opportunity_assignee_with_detail
  SET (security_invoker = true);

ALTER VIEW IF EXISTS public.account_assignees_with_details
  SET (security_invoker = true);

ALTER VIEW IF EXISTS public.contact_assignees_with_details
  SET (security_invoker = true);