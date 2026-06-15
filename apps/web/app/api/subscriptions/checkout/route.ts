import { enhanceRouteHandler } from '@kit/next/routes';

import { createCheckoutSession } from './controller';

export const POST = enhanceRouteHandler(createCheckoutSession, {
  auth: true,
});
