/**
 * @fileoverview Exchange Rate Sync Service
 *
 * Fetches daily exchange rates from the Frankfurter API (free, no API key required)
 * and stores them in the `currency_exchange_rates` table for historical tracking.
 *
 * **Why Frankfurter API?**
 * - Free, no API key required (https://api.frankfurter.dev)
 * - Rates from European Central Bank
 * - Supports 30+ currencies
 * - Updated daily at 16:00 CET
 *
 * **Platform Base Currency: USD**
 * All rates are stored relative to USD as the base.
 * The API natively supports EUR as base, so we convert via EUR -> USD cross rate.
 *
 * @usage
 * ```ts
 * const result = await ExchangeRateSync.syncAll();
 * console.log(result.ratesFetched); // Number of rates stored
 * ```
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import type { Database } from '@kit/supabase/database';

// =====================================================
// CONFIGURATION
// =====================================================

const FRANKFURTER_API_BASE = 'https://api.frankfurter.dev/v1';

/**
 * Currencies to track. These are the most commonly used currencies
 * across Leadgaze workspaces. Add more as needed.
 */
const TRACKED_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'INR',
  'AED',
  'CAD',
  'AUD',
  'JPY',
  'SGD',
  'CHF',
];

// =====================================================
// TYPES
// =====================================================

interface FrankfurterRatesResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

export interface SyncResult {
  success: boolean;
  ratesFetched: number;
  ratesInserted: number;
  errors: string[];
  timestamp: string;
}

// =====================================================
// SYNC SERVICE
// =====================================================

export class ExchangeRateSync {
  private static readonly PROVIDER = 'frankfurter-api';

  /**
   * Fetch all tracked currency rates from Frankfurter API.
   * Uses EUR as the intermediary then converts to USD base.
   */
  private static async fetchRatesFromProvider(): Promise<
    Record<string, number>
  > {
    const url = `${FRANKFURTER_API_BASE}/latest?from=EUR&to=${TRACKED_CURRENCIES.join(',')}`;

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      // Timeout after 10 seconds
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(
        `Frankfurter API error: ${response.status} ${response.statusText}`,
      );
    }

    const data: FrankfurterRatesResponse = await response.json();
    return data.rates;
  }

  /**
   * Convert EUR-based rates to USD-based rates.
   *
   * Frankfurter returns rates relative to EUR.
   * We need rates relative to USD.
   *
   * Formula: rate(USD -> X) = rate(EUR -> X) / rate(EUR -> USD)
   */
  private static convertToUsdBase(
    eurRates: Record<string, number>,
  ): Record<string, number> {
    const eurToUsd = eurRates['USD'];

    if (!eurToUsd || eurToUsd <= 0) {
      throw new Error('EUR -> USD rate not available from provider');
    }

    const usdRates: Record<string, number> = {};

    for (const [currency, rate] of Object.entries(eurRates)) {
      // Skip EUR -> EUR (always 1)
      if (currency === 'EUR') continue;

      // Calculate USD -> currency rate
      // e.g., rate(EUR -> INR) = 90, rate(EUR -> USD) = 1.09
      // rate(USD -> INR) = 90 / 1.09 = 82.57
      usdRates[currency] = Math.round((rate / eurToUsd) * 1_000_000) / 1_000_000;
    }

    // Also add the USD -> USD rate (always 1)
    usdRates['USD'] = 1;

    // Add EUR rate (USD -> EUR)
    usdRates['EUR'] = Math.round((1 / eurToUsd) * 1_000_000) / 1_000_000;

    // Add inverse rates: EUR -> USD (which is just the raw eurToUsd rate)
    // Already available as usdRates['EUR']

    return usdRates;
  }

  /**
   * Store fetched rates in the database.
   * Uses upsert to avoid duplicates for the same currency pair and timestamp.
   */
  private static async storeRates(
    usdRates: Record<string, number>,
    timestamp: string,
  ): Promise<number> {
    const adminClient = getSupabaseServerAdminClient<Database>();

    const records = Object.entries(usdRates).map(([currency, rate]) => ({
      base_currency: 'USD',
      target_currency: currency,
      exchange_rate: rate,
      provider: this.PROVIDER,
      fetched_at: timestamp,
    }));

    const { data, error } = await adminClient
      .schema('core')
      .from('currency_exchange_rates')
      .upsert(records, { onConflict: 'base_currency,target_currency' })
      .select();

    if (error) {
      throw new Error(`Failed to store exchange rates: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Perform a full sync: fetch, convert, store.
   * Returns a detailed result object.
   */
  static async syncAll(): Promise<SyncResult> {
    const startedAt = Date.now();
    const errors: string[] = [];
    const timestamp = new Date().toISOString();

    try {
      console.log('[ExchangeRateSync] Starting exchange rate sync...');

      // Step 1: Fetch from provider
      const eurRates = await this.fetchRatesFromProvider();
      const fetchedCount = Object.keys(eurRates).length;

      // Step 2: Convert to USD base
      const usdRates = this.convertToUsdBase(eurRates);

      // Step 3: Store in database
      const insertedCount = await this.storeRates(usdRates, timestamp);

      const duration = Date.now() - startedAt;
      console.log(
        `[ExchangeRateSync] Sync complete: ${fetchedCount} fetched, ${insertedCount} inserted in ${duration}ms`,
      );

      return {
        success: true,
        ratesFetched: fetchedCount,
        ratesInserted: insertedCount,
        errors,
        timestamp,
      };
    } catch (error: any) {
      const message = error?.message || 'Unknown error during sync';
      console.error('[ExchangeRateSync] Sync failed:', message);
      errors.push(message);

      return {
        success: false,
        ratesFetched: 0,
        ratesInserted: 0,
        errors,
        timestamp,
      };
    }
  }
}
