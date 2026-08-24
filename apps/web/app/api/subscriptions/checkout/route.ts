import { enhanceRouteHandler } from '@kit/next/routes';

import { createCompatibleCheckoutSession } from './controller';

export const POST = enhanceRouteHandler(createCompatibleCheckoutSession, {
  auth: true,
});
