import { enhanceRouteHandler } from '@kit/next/routes';

import { cancelSubscription } from './controller';

export const POST = enhanceRouteHandler(cancelSubscription, {
  auth: true,
});
