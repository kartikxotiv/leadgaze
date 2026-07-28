-- Migration: Backfill multi-currency fields for existing opportunities
-- Date: 2026-07-06
-- Description: Backfills amount_original, currency_original, exchange_rate_to_usd,
--              exchange_rate_date, exchange_rate_source, and base_amount_usd for
--              any existing opportunities using the stored currency exchange rates.

-- 1. Backfill primary fields (amount_original, currency_original, exchange_rate_to_usd, exchange_rate_date, exchange_rate_source)
UPDATE public.crm_opportunities co
SET
  amount_original = COALESCE(co.amount_original, co.amount),
  currency_original = COALESCE(co.currency_original, co.currency),
  exchange_rate_to_usd = COALESCE(
    co.exchange_rate_to_usd,
    CASE 
      WHEN COALESCE(co.currency, 'USD') = 'USD' THEN 1.0
      ELSE (
        SELECT er.exchange_rate 
        FROM core.currency_exchange_rates er 
        WHERE er.base_currency = 'USD' 
          AND er.target_currency = co.currency
        LIMIT 1
      )
    END,
    1.0
  ),
  exchange_rate_date = COALESCE(
    co.exchange_rate_date,
    (
      SELECT er.fetched_at::date 
      FROM core.currency_exchange_rates er 
      WHERE er.base_currency = 'USD' 
        AND er.target_currency = co.currency
      LIMIT 1
    ),
    co.created_at::date
  ),
  exchange_rate_source = COALESCE(co.exchange_rate_source, 'MIGRATED')
WHERE co.amount_original IS NULL OR co.exchange_rate_to_usd IS NULL;

-- 2. Calculate base_amount_usd using backfilled amount_original and exchange_rate_to_usd
UPDATE public.crm_opportunities
SET base_amount_usd = amount_original / exchange_rate_to_usd
WHERE base_amount_usd IS NULL 
  AND exchange_rate_to_usd IS NOT NULL 
  AND exchange_rate_to_usd > 0;
