/**
 * @fileoverview Currency formatting utilities for workspace-aware reporting.
 * Builds on top of the base `formatCurrency` from @kit/shared/utils.
 *
 * These utilities are used on the server side (API routes) and in scenarios
 * where the React `useLocalization` hook is not available (e.g., exports,
 * PDF generation, server-rendered reports).
 */

import { formatCurrency as baseFormatCurrency } from '../utils';

/**
 * Format an amount as currency with proper locale formatting.
 * This is a convenience wrapper over the base formatCurrency that
 * provides workspace-aware defaults.
 *
 * @param value - Numeric value or string to format
 * @param currencyCode - ISO 4217 currency code (default: 'USD')
 * @param locale - BCP 47 locale (default: 'en-US')
 */
export function formatWorkspaceCurrency(
  value: number | string,
  currencyCode: string = 'USD',
  locale: string = 'en-US',
): string {
  return baseFormatCurrency({
    value,
    currencyCode,
    locale,
  });
}

/**
 * Format a USD amount into a target report currency using a rate.
 * Uses the stored base_amount_usd (always in USD) and multiplies
 * by the historical rate to display in the user's chosen report currency.
 *
 * @param baseAmountUsd - The amount in USD (base_amount_usd from DB)
 * @param targetCurrency - Desired output currency code
 * @param rateToTarget - Historical exchange rate from USD to target currency
 * @param locale - BCP 47 locale
 */
export function formatReportCurrency(
  baseAmountUsd: number,
  targetCurrency: string,
  rateToTarget: number,
  locale: string = 'en-US',
): string {
  const convertedAmount = baseAmountUsd * rateToTarget;
  return baseFormatCurrency({
    value: convertedAmount,
    currencyCode: targetCurrency,
    locale,
  });
}
