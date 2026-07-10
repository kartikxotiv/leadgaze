/**
 * Helper to determine the correct Stripe price ID based on billing country.
 * Supports dual-stripe pricing logic for India vs Global.
 * 
 * @param product The subscription product object from the database
 * @param billingCountry The ISO country code (e.g., 'IN', 'US')
 * @param billingCycle The billing cycle ('monthly' or 'yearly')
 * @returns The Stripe price ID or null if not found
 */
export function getStripePriceId(
  product: {
    stripe_monthly_price_id?: string | null;
    stripe_yearly_price_id?: string | null;
    stripe_india_monthly_price_id?: string | null;
    stripe_india_yearly_price_id?: string | null;
  },
  billingCountry: string | null | undefined,
  billingCycle: 'monthly' | 'yearly',
): string | null | undefined {
  if (billingCountry === 'IN' || billingCountry?.toLowerCase() === 'india') {
    return billingCycle === 'monthly'
      ? product.stripe_india_monthly_price_id
      : product.stripe_india_yearly_price_id;
  }

  return billingCycle === 'monthly'
    ? product.stripe_monthly_price_id
    : product.stripe_yearly_price_id;
}
