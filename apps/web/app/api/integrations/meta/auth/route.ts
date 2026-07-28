import { enhanceRouteHandler } from '@kit/next/routes';
import { metaAdsAuth } from './controller';

export const dynamic = 'force-dynamic';
export const GET = enhanceRouteHandler(metaAdsAuth, { auth: true });
