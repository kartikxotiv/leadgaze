import { enhanceRouteHandler } from '@kit/next/routes';

import { inviteMember } from '../controller';

export const POST = enhanceRouteHandler(inviteMember, {
  auth: false,
});
