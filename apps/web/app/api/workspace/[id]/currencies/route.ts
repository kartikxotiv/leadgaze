import { NextRequest } from 'next/server';

import { enhanceRouteHandler } from '@kit/next/routes';

import { getWorkspaceCurrenciesWithRates } from './controller';

/**
 * GET /api/workspace/{id}/currencies
 * 
 * Enhanced workspace currencies endpoint that includes exchange rates.
 * Replaces direct Supabase calls from frontend for workspace currencies + exchange rates.
 */
export const GET = enhanceRouteHandler(getWorkspaceCurrenciesWithRates, {
  auth: true,
});