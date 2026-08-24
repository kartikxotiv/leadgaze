import { enhanceRouteHandler } from '@kit/next/routes';

import { getSubscriptionNotifications } from './controller';

export const GET = enhanceRouteHandler(getSubscriptionNotifications, {
  auth: true,
});
