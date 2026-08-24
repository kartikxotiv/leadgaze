import { enhanceRouteHandler } from '@kit/next/routes';

import { getPublicPricing } from './controller';

export const GET = enhanceRouteHandler(getPublicPricing, { auth: false });
