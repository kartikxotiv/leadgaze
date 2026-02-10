import { enhanceRouteHandler } from '~/utils/enhance-route-handler';

import { getInvitationsByEmail } from './controller';

export const GET = enhanceRouteHandler(getInvitationsByEmail, {
  auth: false, // Allow unauthenticated access for signup flow
});
