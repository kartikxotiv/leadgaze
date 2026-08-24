import { enhanceRouteHandler } from '@kit/next/routes';

import { getSubscriptions } from './controller';

export const GET = enhanceRouteHandler(getSubscriptions, {
  auth: true,
});
