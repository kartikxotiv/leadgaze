-- Migration: Add Tax ID to companies table
-- Date: 2026-07-06

ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS tax_id VARCHAR(255);

COMMENT ON COLUMN public.companies.tax_id IS 'Tax ID / TIN of the company (validated).';
