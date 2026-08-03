import { enhanceRouteHandler } from '@kit/next/routes';

import { getContactsMeta } from './controller';

export const GET = enhanceRouteHandler(getContactsMeta, {
  auth: false,
});
