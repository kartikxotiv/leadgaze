import { NextRequest } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse,
  errorResponse,
} from '~/utils/response-handler';

/**
 * GET /api/workspace/{id}/currencies
 * 
 * Enhanced endpoint that fetches workspace currencies along with latest exchange rates.
 * This replaces multiple direct Supabase calls from the frontend.
 */
export const getWorkspaceCurrenciesWithRates = catchAsync(
  async ({ 
    request,
    params 
  }: { 
    request: NextRequest;
    params: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient() as any;
    const workspaceId = params.id;

    if (!workspaceId) {
      return errorResponse('Workspace ID is required', 400);
    }

    try {
      // Get workspace currencies
      const { data: currencies, error: currenciesError } = await supabase
        .schema('core')
        .from('workspace_currencies')
        .select('currency_code, is_default, is_active, currency_symbol, created_at, updated_at')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('currency_code', { ascending: true });

      if (currenciesError) {
        console.error('[Workspace Currencies] Error fetching currencies:', currenciesError);
        return errorResponse('Failed to fetch workspace currencies', 500);
      }

      // Get latest exchange rates for all currencies
      // This gets the most recent rate for each currency pair
      const { data: exchangeRates, error: ratesError } = await supabase
        .schema('core')
        .from('exchange_rates')
        .select('from_currency, to_currency, rate, date, source')
        .order('date', { ascending: false });

      if (ratesError) {
        console.error('[Workspace Currencies] Error fetching exchange rates:', ratesError);
        // Don't fail the request, just log the error and return empty rates
      }

      // Process exchange rates to get latest for each currency pair
      const latestRates: Record<string, any> = {};
      
      if (exchangeRates) {
        exchangeRates.forEach(rate => {
          const key = `${rate.from_currency}-${rate.to_currency}`;
          if (!latestRates[key] || new Date(rate.date) > new Date(latestRates[key].date)) {
            latestRates[key] = rate;
          }
        });
      }

      console.log(`[Workspace Currencies] Retrieved ${currencies?.length || 0} currencies and ${Object.keys(latestRates).length} exchange rates for workspace ${workspaceId}`);

      return successDataResponse('Workspace currencies fetched successfully', {
        currencies: currencies || [],
        exchangeRates: Object.values(latestRates),
        metadata: {
          workspace_id: workspaceId,
          currencies_count: currencies?.length || 0,
          exchange_rates_count: Object.keys(latestRates).length,
          fetched_at: new Date().toISOString(),
        }
      });

    } catch (error) {
      console.error('[Workspace Currencies] Unexpected error:', error);
      return errorResponse(
        error instanceof Error 
          ? `Failed to fetch workspace currencies: ${error.message}`
          : 'Failed to fetch workspace currencies',
        500
      );
    }
  }
);