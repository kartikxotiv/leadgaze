import { enhanceRouteHandler } from '@kit/next/routes';

import { getAccountsMeta } from './controller';

export const GET = enhanceRouteHandler(getAccountsMeta, {
  auth: false,
});
