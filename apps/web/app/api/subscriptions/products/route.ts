import { enhanceRouteHandler } from '@kit/next/routes';

import { getProducts } from './controller';

export const GET = enhanceRouteHandler(getProducts, {
  auth: true,
});
