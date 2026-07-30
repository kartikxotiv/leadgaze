import { enhanceRouteHandler } from '@kit/next/routes';
import { getGoogleAdsSettings, mutateGoogleAdsSettings } from './controller';

export const GET = enhanceRouteHandler(getGoogleAdsSettings);
export const POST = enhanceRouteHandler(mutateGoogleAdsSettings);
