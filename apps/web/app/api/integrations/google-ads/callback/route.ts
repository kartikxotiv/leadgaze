import { enhanceRouteHandler } from '@kit/next/routes';
import { googleAdsCallback } from './controller';

export const dynamic = 'force-dynamic';

export const GET = enhanceRouteHandler(googleAdsCallback);
