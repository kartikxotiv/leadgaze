/*
 * -------------------------------------------------------
 * Migration: Add is_public field to CRM tables
 * Date: 2026-01-29
 * Description: Adds is_public field to crm_accounts, crm_contacts, and crm_opportunities
 *              to match the visibility control pattern used in crm_leads
 * -------------------------------------------------------
 */

-- Add is_public to crm_accounts
ALTER TABLE public.crm_accounts
ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.crm_accounts.is_public IS 'If TRUE, visible to all workspace members; if FALSE, visible only to owner and assignees';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_crm_accounts_visibility ON public.crm_accounts(workspace_id, is_public) WHERE is_deleted = FALSE;

-- Add is_public to crm_contacts
ALTER TABLE public.crm_contacts
ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.crm_contacts.is_public IS 'If TRUE, visible to all workspace members; if FALSE, visible only to owner and assignees';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_crm_contacts_visibility ON public.crm_contacts(workspace_id, is_public) WHERE is_deleted = FALSE;

-- Add is_public to crm_opportunities
ALTER TABLE public.crm_opportunities
ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.crm_opportunities.is_public IS 'If TRUE, visible to all workspace members; if FALSE, visible only to owner and assignees';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_visibility ON public.crm_opportunities(workspace_id, is_public) WHERE is_deleted = FALSE;
