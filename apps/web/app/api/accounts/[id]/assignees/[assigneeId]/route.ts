import { enhanceRouteHandler } from '@kit/next/routes';

import { unassignAccountFromUser } from '../controller';

export const DELETE = enhanceRouteHandler(unassignAccountFromUser, {
  auth: false,
});
