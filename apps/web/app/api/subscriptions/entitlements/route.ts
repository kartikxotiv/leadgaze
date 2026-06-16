import { enhanceRouteHandler } from '@kit/next/routes';

import { getEntitlements } from './controller';

export const GET = enhanceRouteHandler(getEntitlements, {
  auth: true,
});
