/*
 * -------------------------------------------------------
 * Migration: Add Stripe IDs to subscription_products
 * Date: 2026-06-11
 * Description:
 *   Adds Stripe product and price reference columns to the
 *   subscription_products table so each Leadgaze module can
 *   be linked to its corresponding Stripe product and prices.
 * -------------------------------------------------------
 */

-- Add Stripe reference columns to subscription_products
ALTER TABLE public.subscription_products
  ADD COLUMN IF NOT EXISTS stripe_product_id      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_monthly_price_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_yearly_price_id  VARCHAR(255);

COMMENT ON COLUMN public.subscription_products.stripe_product_id IS
  'Stripe product ID (prod_xxx). Links this Leadgaze module to a Stripe product.';

COMMENT ON COLUMN public.subscription_products.stripe_monthly_price_id IS
  'Stripe price ID (price_xxx) for the monthly recurring seat price.';

COMMENT ON COLUMN public.subscription_products.stripe_yearly_price_id IS
  'Stripe price ID (price_xxx) for the yearly recurring seat price.';

-- Index for quick lookup by Stripe product ID (used in webhook resolution)
CREATE INDEX IF NOT EXISTS idx_sub_products_stripe_product
  ON public.subscription_products(stripe_product_id)
  WHERE stripe_product_id IS NOT NULL;


-- Drop unique name constraint from service_cloud.organizations
ALTER TABLE service_cloud.organizations DROP CONSTRAINT IF EXISTS sc_organizations_name_unique;