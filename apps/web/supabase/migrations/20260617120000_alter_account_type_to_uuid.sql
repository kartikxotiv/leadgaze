-- Migration: Alter account_type to UUID FK to entity_statuses
-- Date: 2026-06-17
-- Description: Change account_type in crm_accounts from VARCHAR to UUID referencing entity_statuses.id

-- First, set all existing account_type values to NULL (they're text values like "Customer" which can't be converted to UUID)
UPDATE public.crm_accounts SET account_type = NULL WHERE account_type IS NOT NULL;

-- Alter the column type to UUID
ALTER TABLE public.crm_accounts ALTER COLUMN account_type TYPE UUID USING NULL;

-- Add FK constraint with explicit name so Supabase joins work
-- This allows entity_statuses_account_type_fkey join in Supabase queries
ALTER TABLE public.crm_accounts ADD CONSTRAINT entity_statuses_account_type_fkey
  FOREIGN KEY (account_type) REFERENCES public.entity_statuses(id) ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN public.crm_accounts.account_type IS 'FK to entity_statuses.id for accounts module - stores the account type (Customer, Prospect, Partner, Vendor)';
