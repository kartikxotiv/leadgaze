import { enhanceRouteHandler } from '@kit/next/routes';

import { inviteUser } from './controller';

export const POST = enhanceRouteHandler(inviteUser, {
  auth: true,
});
