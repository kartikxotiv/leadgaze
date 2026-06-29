/**
 * @fileoverview Currency service for the Leadgaze platform.
 *
 * Provides utilities for:
 * - Fetching exchange rates from the shared database
 * - Validating workspace currency support
 * - Computing exchange rate on a given date
 *
 * These functions work on both client and server side.
 * Server-side API routes should prefer database lookups.
 */

import {
  convertToUSD,
  isValidExchangeRate,
} from './currency.converter';

// =====================================================
// TYPES
// =====================================================

export interface ExchangeRateRecord {
  id?: string;
  base_currency: string;
  target_currency: string;
  exchange_rate: number;
  provider: string;
  fetched_at: string;
}

export interface WorkspaceCurrencyInfo {
  id: string;
  workspace_id: string;
  currency_code: string;
  currency_symbol: string;
  is_default: boolean;
  is_active: boolean;
}

// =====================================================
// VALIDATION
// =====================================================

/**
 * Check whether a currency code is enabled for the given workspace.
 * Pass the list of workspace currencies (fetched from API).
 */
export function isCurrencyEnabledForWorkspace(
  currencyCode: string,
  workspaceCurrencies: WorkspaceCurrencyInfo[],
): boolean {
  return workspaceCurrencies.some(
    (wc) =>
      wc.currency_code.toUpperCase() === currencyCode.toUpperCase() &&
      wc.is_active,
  );
}

/**
 * Find the default currency for a workspace from the currencies list.
 */
export function getDefaultWorkspaceCurrency(
  workspaceCurrencies: WorkspaceCurrencyInfo[],
): WorkspaceCurrencyInfo | undefined {
  return workspaceCurrencies.find((wc) => wc.is_default);
}

// =====================================================
// EXCHANGE RATE LOOKUP
// =====================================================

/**
 * Given a list of exchange rates (fetched from currency_exchange_rates table),
 * find the latest rate for a given target currency where base is USD.
 *
 * @example
 * findLatestRateToUsd(rates, 'INR') => { exchange_rate: 83.12, ... }
 */
export function findLatestRateToUsd(
  rates: ExchangeRateRecord[],
  targetCurrency: string,
): ExchangeRateRecord | undefined {
  const target = targetCurrency.toUpperCase();

  // If target is USD itself, rate is 1:1
  if (target === 'USD') {
    return {
      base_currency: 'USD',
      target_currency: 'USD',
      exchange_rate: 1,
      provider: 'system',
      fetched_at: new Date().toISOString(),
    };
  }

  // Find the latest rate for USD -> target
  const usdRates = rates
    .filter(
      (r) =>
        r.base_currency.toUpperCase() === 'USD' &&
        r.target_currency.toUpperCase() === target,
    )
    .sort(
      (a, b) =>
        new Date(b.fetched_at).getTime() - new Date(a.fetched_at).getTime(),
    );

  return usdRates[0];
}

/**
 * Find the exchange rate valid on a specific date (for historical reporting).
 * Looks for the rate whose fetched_at is closest to (but not after) the given date.
 *
 * @param rates - All exchange rate records for the target pair
 * @param targetDate - The date for which to find the rate
 * @returns The rate closest to but not after targetDate, or the earliest rate after
 */
export function findHistoricalRate(
  rates: ExchangeRateRecord[],
  targetDate: Date,
): ExchangeRateRecord | undefined {
  const targetTs = targetDate.getTime();

  // Sort ascending by date
  const sorted = [...rates].sort(
    (a, b) =>
      new Date(a.fetched_at).getTime() - new Date(b.fetched_at).getTime(),
  );

  // Find the most recent rate on or before targetDate
  let best: ExchangeRateRecord | undefined;
  for (const rate of sorted) {
    const rateTs = new Date(rate.fetched_at).getTime();
    if (rateTs <= targetTs) {
      best = rate; // Keep updating to get the closest one
    } else {
      break; // Past the target date
    }
  }

  // If no rate found before targetDate, return the earliest available rate
  if (!best && sorted.length > 0) {
    best = sorted[0];
  }

  return best;
}

// =====================================================
// COMPUTATION
// =====================================================

/**
 * Compute base_amount_usd for an opportunity given the original amount,
 * original currency, and the exchange rate from USD to that currency.
 *
 * @param amountOriginal - The amount in the original currency
 * @param exchangeRateToUsd - Exchange rate (1 USD = X original currency)
 * @returns The computed base USD amount, or null if invalid
 */
export function computeBaseAmountUsd(
  amountOriginal: number,
  exchangeRateToUsd: number,
): number | null {
  if (!isValidExchangeRate(exchangeRateToUsd)) return null;
  if (amountOriginal == null || isNaN(amountOriginal)) return null;
  return convertToUSD(amountOriginal, exchangeRateToUsd);
}

/**
 * Create a new export object for opportunity currency fields.
 *
 * @returns A partial object suitable for inserting into crm_opportunities
 */
export function buildOpportunityCurrencyFields(params: {
  amount: number;
  currency: string;
  exchangeRateToUsd: number;
  rateDate: string;
}): {
  amount_original: number;
  currency_original: string;
  base_amount_usd: number | null;
  exchange_rate_to_usd: number;
  exchange_rate_date: string;
} {
  return {
    amount_original: params.amount,
    currency_original: params.currency.toUpperCase(),
    base_amount_usd: computeBaseAmountUsd(
      params.amount,
      params.exchangeRateToUsd,
    ),
    exchange_rate_to_usd: params.exchangeRateToUsd,
    exchange_rate_date: params.rateDate,
  };
}
