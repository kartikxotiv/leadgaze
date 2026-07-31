import { enhanceRouteHandler } from '@kit/next/routes';
import { googleAdsAuth } from './controller';

export const dynamic = 'force-dynamic';

export const GET = enhanceRouteHandler(googleAdsAuth, { auth: true });
