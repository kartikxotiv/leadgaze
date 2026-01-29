/*
 * -------------------------------------------------------
 * Migration: Update Leads Industry to Foreign Key
 * Date: 2026-01-29
 * Description: Changes crm_leads.industry from VARCHAR to industry_id FK reference
 *              to match the pattern used in crm_accounts table
 * -------------------------------------------------------
 */

-- Step 1: Add industry_id column (nullable initially to allow migration)
ALTER TABLE public.crm_leads
ADD COLUMN IF NOT EXISTS industry_id UUID REFERENCES public.crm_industries(id) ON DELETE SET NULL;

-- Step 2: Migrate existing industry text values to industry_id
-- This will match existing industry names to crm_industries table
UPDATE public.crm_leads
SET industry_id = (
    SELECT ci.id
    FROM public.crm_industries ci
    WHERE ci.workspace_id = crm_leads.workspace_id
      AND ci.industry_name = crm_leads.industry
    LIMIT 1
)
WHERE industry IS NOT NULL
  AND industry_id IS NULL;

-- Step 3: Create index for performance
CREATE INDEX IF NOT EXISTS idx_crm_leads_industry ON public.crm_leads(industry_id);

-- Step 4: Drop the old industry VARCHAR column
ALTER TABLE public.crm_leads
DROP COLUMN IF EXISTS industry;

COMMENT ON COLUMN public.crm_leads.industry_id IS 'References crm_industries table for standardized industry tracking';
