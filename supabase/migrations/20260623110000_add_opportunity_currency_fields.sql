/*
 * -------------------------------------------------------
 * Migration: Add Multi-Currency Fields to Opportunities
 * Date: 2026-06-23
 * Description: Adds monetary tracking fields to crm_opportunities
 * so each opportunity can store its original amount + currency,
 * the base USD equivalent, and the exchange rate used at creation.
 * This enables accurate historical reporting regardless of
 * future exchange rate fluctuations.
 *
 * Per the currency-setup.md spec:
 * - amount_original: The amount entered by the user in the selected currency
 * - currency_original: The currency code selected by the user
 * - base_amount_usd: Calculated as amount_original / exchange_rate_to_usd
 * - exchange_rate_to_usd: The rate used (1 USD = X currency_original)
 * - exchange_rate_date: The date of the exchange rate
 * -------------------------------------------------------
 */

-- =====================================================
-- 1. ADD MULTI-CURRENCY COLUMNS TO crm_opportunities
-- =====================================================

ALTER TABLE public.crm_opportunities
  ADD COLUMN IF NOT EXISTS amount_original NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS currency_original CHAR(3),
  ADD COLUMN IF NOT EXISTS base_amount_usd NUMERIC(18,6),
  ADD COLUMN IF NOT EXISTS exchange_rate_to_usd NUMERIC(18,10),
  ADD COLUMN IF NOT EXISTS exchange_rate_date DATE;

-- =====================================================
-- 2. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_crm_opportunities_currency_original
  ON public.crm_opportunities(currency_original);

CREATE INDEX IF NOT EXISTS idx_crm_opportunities_base_amount_usd
  ON public.crm_opportunities(base_amount_usd);

-- =====================================================
-- 3. COMMENTS
-- =====================================================

COMMENT ON COLUMN public.crm_opportunities.amount_original IS
  'Original amount entered by the user in the selected currency';

COMMENT ON COLUMN public.crm_opportunities.currency_original IS
  'ISO 4217 currency code of the original amount';

COMMENT ON COLUMN public.crm_opportunities.base_amount_usd IS
  'USD equivalent of amount_original using exchange_rate_to_usd.
   Used for cross-currency reporting and aggregation.';

COMMENT ON COLUMN public.crm_opportunities.exchange_rate_to_usd IS
  'Exchange rate used: 1 USD = X currency_original.
   base_amount_usd = amount_original / exchange_rate_to_usd';

COMMENT ON COLUMN public.crm_opportunities.exchange_rate_date IS
  'Date when the exchange rate was fetched / valid as of';
