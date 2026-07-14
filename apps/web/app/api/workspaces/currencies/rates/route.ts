import { enhanceRouteHandler } from '@kit/next/routes';

import { getExchangeRates, getAllExchangeRates } from './controller';

export const GET = enhanceRouteHandler(
  async ({ request }: { request: Request }) => {
    const { searchParams } = new URL(request.url);
    const target = searchParams.get('target');

    // If no target specified, return all rates for the base currency
    if (!target) {
      return getAllExchangeRates({ request: request as any });
    }

    return getExchangeRates({ request: request as any });
  },
  { auth: false },
);
