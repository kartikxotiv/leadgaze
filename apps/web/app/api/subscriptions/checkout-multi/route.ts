import { enhanceRouteHandler } from '@kit/next/routes';

import { createMultiProductCheckout } from './controller';

export const POST = enhanceRouteHandler(createMultiProductCheckout, {
  auth: true,
});
