import { enhanceRouteHandler } from '@kit/next/routes';

import { acceptInvite } from './controller';

export const POST = enhanceRouteHandler(acceptInvite, {
  auth: false,
});
