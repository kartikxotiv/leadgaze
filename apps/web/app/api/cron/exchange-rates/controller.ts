/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

import { ExchangeRateSync } from '~/lib/currency/exchange-rate-sync';

/**
 * Cron controller for daily exchange rate sync.
 * Triggered by Vercel Cron Jobs or any scheduled HTTP request.
 *
 * Schedule: Daily at 00:05 UTC
 * Endpoint: GET /api/cron/exchange-rates
 */
const syncExchangeRatesController = async (_request: NextRequest) => {
  try {
    console.log('[Cron] Starting exchange rate sync...');
    const startTime = Date.now();

    const result = await ExchangeRateSync.syncAll();

    const duration = Date.now() - startTime;

    const response = {
      success: result.success,
      timestamp: result.timestamp,
      duration: `${duration}ms`,
      rates: {
        fetched: result.ratesFetched,
        inserted: result.ratesInserted,
      },
      errors: result.errors.length > 0 ? result.errors : undefined,
    };

    if (!result.success) {
      console.error('[Cron] Exchange rate sync failed:', result.errors);
      return NextResponse.json(response, { status: 500 });
    }

    console.log('[Cron] Exchange rate sync complete:', response);
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Cron] Error in exchange rate sync:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
};

export { syncExchangeRatesController };
