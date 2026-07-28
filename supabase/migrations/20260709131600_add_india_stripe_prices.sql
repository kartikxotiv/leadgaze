/*
 * -------------------------------------------------------
 * Migration: Add India Stripe prices
 * Date: 2026-07-09
 * Description:
 *   Adds Stripe India price IDs to subscription_products
 *   to support dual-stripe billing logic.
 * -------------------------------------------------------
 */

ALTER TABLE public.subscription_products
  ADD COLUMN IF NOT EXISTS stripe_india_monthly_price_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_india_yearly_price_id  VARCHAR(255);

COMMENT ON COLUMN public.subscription_products.stripe_india_monthly_price_id IS 'Stripe price ID for the monthly recurring seat price in INR.';
COMMENT ON COLUMN public.subscription_products.stripe_india_yearly_price_id IS 'Stripe price ID for the yearly recurring seat price in INR.';

ALTER TABLE public.subscription_products
  ADD COLUMN IF NOT EXISTS india_monthly_price_per_seat NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS india_yearly_price_per_seat  NUMERIC(12, 2);

COMMENT ON COLUMN public.subscription_products.india_monthly_price_per_seat IS 'Display price for the monthly recurring seat in INR.';
COMMENT ON COLUMN public.subscription_products.india_yearly_price_per_seat IS 'Display price for the yearly recurring seat in INR.';
