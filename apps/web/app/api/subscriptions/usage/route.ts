import { enhanceRouteHandler } from '@kit/next/routes';

import { getSubscriptionUsage } from './controller';

export const GET = enhanceRouteHandler(getSubscriptionUsage, { auth: true });
