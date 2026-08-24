import { enhanceRouteHandler } from '@kit/next/routes';

import { addSubscriptionModule, removeSubscriptionModule } from './controller';

export const POST = enhanceRouteHandler(addSubscriptionModule, { auth: true });
export const DELETE = enhanceRouteHandler(removeSubscriptionModule, {
  auth: true,
});
