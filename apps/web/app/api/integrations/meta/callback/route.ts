import { enhanceRouteHandler } from '@kit/next/routes';
import { metaAdsCallback } from './controller';

export const dynamic = 'force-dynamic';
export const GET = enhanceRouteHandler(metaAdsCallback);
