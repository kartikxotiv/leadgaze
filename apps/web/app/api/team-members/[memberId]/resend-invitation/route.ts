import { enhanceRouteHandler } from '@kit/next/routes';

import { resendInvitation } from '../../controller';

// Route pattern: /api/team-members/[memberId]/resend-invitation
export const POST = enhanceRouteHandler(resendInvitation, {
  auth: false,
});
