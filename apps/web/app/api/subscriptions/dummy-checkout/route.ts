import { enhanceRouteHandler } from '@kit/next/routes';

import { dummyCheckout } from './controller';

export const POST = enhanceRouteHandler(dummyCheckout, {
  auth: true,
});
