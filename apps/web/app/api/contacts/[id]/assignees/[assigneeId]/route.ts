import { enhanceRouteHandler } from '@kit/next/routes';

import { unassignContactFromUser } from '../controller';

export const DELETE = enhanceRouteHandler(unassignContactFromUser, {
  auth: false,
});
