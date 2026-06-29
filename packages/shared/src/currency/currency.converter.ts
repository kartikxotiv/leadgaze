/**
 * @fileoverview Currency conversion utilities for the Leadgaze platform.
 *
 * All monetary conversions use USD as the platform base currency.
 *
 * **Conversion Model:**
 * - `exchange_rate_to_usd` = how many units of target currency per 1 USD
 *   (e.g., USD -> INR = 83.12 means 1 USD = 83.12 INR)
 * - `base_amount_usd = amount_original / exchange_rate_to_usd`
 * - To convert to another currency: `base_amount_usd * historical_rate`
 *
 * @example
 * ```ts
 * // Opportunity stored: amount_original=10000, currency_original='EUR', exchange_rate_to_usd=0.92
 * const usdValue = convertToUSD(10000, 0.92);  // => 10869.57
 * const inrValue = convertFromUSD(10869.57, 90); // => 978261.30 (INR at historical rate 90)
 * ```
 */

/**
 * Convert an amount from its original currency to USD.
 * @param amountOriginal - The amount in the original currency
 * @param exchangeRateToUsd - The exchange rate (1 USD = X original currency)
 * @returns Amount in USD, rounded to 6 decimal places
 *
 * @example
 * convertToUSD(10000, 83.12) // 10000 INR at rate 83.12 = 120.29 USD
 */
export function convertToUSD(
  amountOriginal: number,
  exchangeRateToUsd: number,
): number {
  if (!exchangeRateToUsd || exchangeRateToUsd <= 0) return 0;
  return Math.round((amountOriginal / exchangeRateToUsd) * 1_000_000) / 1_000_000;
}

/**
 * Convert an amount from USD to a target currency using a given rate.
 * @param usdAmount - The amount in USD
 * @param rateToTarget - Exchange rate (1 USD = X target currency)
 * @returns Amount in target currency, rounded to 2 decimal places
 *
 * @example
 * convertFromUSD(120.29, 83.12) // 120.29 USD at rate 83.12 = 10000 INR
 */
export function convertFromUSD(
  usdAmount: number,
  rateToTarget: number,
): number {
  if (!rateToTarget || rateToTarget <= 0) return 0;
  return Math.round(usdAmount * rateToTarget * 100) / 100;
}

/**
 * Convert directly between two non-USD currencies using their USD rates.
 *
 * Formula: amount_in_A / (rate_A_to_USD) * (rate_B_to_USD)
 *
 * @param amount - Amount in the source currency
 * @param sourceRateToUsd - Exchange rate from source currency to USD (1 USD = X source)
 * @param targetRateToUsd - Exchange rate from target currency to USD (1 USD = X target)
 * @returns Amount in target currency
 *
 * @example
 * convertCrossCurrency(10000, 83.12, 0.92)
 * // 10000 INR -> 120.29 USD -> 110.67 EUR
 */
export function convertCrossCurrency(
  amount: number,
  sourceRateToUsd: number,
  targetRateToUsd: number,
): number {
  if (!sourceRateToUsd || sourceRateToUsd <= 0) return 0;
  if (!targetRateToUsd || targetRateToUsd <= 0) return 0;
  const usdAmount = amount / sourceRateToUsd;
  return Math.round(usdAmount * targetRateToUsd * 100) / 100;
}

/**
 * Validate that an exchange rate looks reasonable (positive, non-zero, finite).
 */
export function isValidExchangeRate(rate: number): boolean {
  return (
    typeof rate === 'number' &&
    isFinite(rate) &&
    rate > 0 &&
    !isNaN(rate)
  );
}
