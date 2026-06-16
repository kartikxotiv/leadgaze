import { enhanceRouteHandler } from '@kit/next/routes';

import { checkAccess } from './controller';

export const GET = enhanceRouteHandler(checkAccess, {
  auth: true,
});
