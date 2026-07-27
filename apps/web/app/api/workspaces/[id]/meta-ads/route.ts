import { enhanceRouteHandler } from '@kit/next/routes';
import { getMetaAdsSettings, mutateMetaAdsSettings } from './controller';

export const GET = enhanceRouteHandler(getMetaAdsSettings);
export const POST = enhanceRouteHandler(mutateMetaAdsSettings);
