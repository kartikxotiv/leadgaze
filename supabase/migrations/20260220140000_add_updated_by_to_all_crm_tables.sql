/*
 * -------------------------------------------------------
 * Migration: Add updated_by to CRM tables (Contacts, Accounts, Opportunities)
 * Date: 2026-02-20
 * Description: Adds the missing updated_by column to crm_contacts, crm_accounts,
 * and crm_opportunities tables to track who last modified the records.
 * -------------------------------------------------------
 */

-- 1. Add updated_by to crm_contacts
ALTER TABLE public.crm_contacts 
ADD COLUMN IF NOT EXISTS updated_by UUID CONSTRAINT crm_contacts_updated_by_fkey REFERENCES public.accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crm_contacts_updated_by ON public.crm_contacts(updated_by);

COMMENT ON COLUMN public.crm_contacts.updated_by IS 'Account (user) who last updated this contact record';


-- 2. Add updated_by to crm_accounts
ALTER TABLE public.crm_accounts 
ADD COLUMN IF NOT EXISTS updated_by UUID CONSTRAINT crm_accounts_updated_by_fkey REFERENCES public.accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crm_accounts_updated_by ON public.crm_accounts(updated_by);

COMMENT ON COLUMN public.crm_accounts.updated_by IS 'Account (user) who last updated this account record';


-- 3. Add updated_by to crm_opportunities
ALTER TABLE public.crm_opportunities 
ADD COLUMN IF NOT EXISTS updated_by UUID CONSTRAINT crm_opportunities_updated_by_fkey REFERENCES public.accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crm_opportunities_updated_by ON public.crm_opportunities(updated_by);

COMMENT ON COLUMN public.crm_opportunities.updated_by IS 'Account (user) who last updated this opportunity record';
