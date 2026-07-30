import { enhanceRouteHandler } from '@kit/next/routes';

import { getUsers } from './controller';

export const GET = enhanceRouteHandler(getUsers, {
  auth: true,
});
