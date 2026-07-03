-- Migration: Add exchange_rate_source Column to Opportunities
-- Date: 2026-06-25
-- Description: Adds exchange_rate_source enum column to crm_opportunities
-- to identify where exchange rate originated (LIVE/MIGRATED/MANUAL)

-- =====================================================
-- 1. ADD exchange_rate_source COLUMN TO crm_opportunities
-- =====================================================

ALTER TABLE public.crm_opportunities
  ADD COLUMN IF NOT EXISTS exchange_rate_source TEXT CHECK (
    exchange_rate_source IN ('LIVE', 'MIGRATED', 'MANUAL')
  );

-- =====================================================
-- 2. INDEX FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_crm_opportunities_exchange_rate_source
  ON public.crm_opportunities(exchange_rate_source);

-- =====================================================
-- 3. COMMENT
-- =====================================================

COMMENT ON COLUMN public.crm_opportunities.exchange_rate_source IS
  'Source of exchange rate: LIVE (fetched from API), MIGRATED (legacy data migration), MANUAL (user-entered)';
