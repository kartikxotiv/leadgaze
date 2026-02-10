import { enhanceRouteHandler } from '@kit/next/routes';

import { getInvitationsByEmail } from './controller';

export const GET = enhanceRouteHandler(getInvitationsByEmail, {
  auth: false, // Allow unauthenticated access for signup flow
});
