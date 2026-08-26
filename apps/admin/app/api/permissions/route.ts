import { enhanceRouteHandler } from '@kit/next/routes';

import { getPermissions } from './controller';

export const GET = enhanceRouteHandler(getPermissions, {
  auth: true,
});
