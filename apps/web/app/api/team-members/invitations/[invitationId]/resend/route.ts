import { enhanceRouteHandler } from '@kit/next/routes';

import { resendInvitationEmail } from '../../../controller';

// Route pattern: POST /api/team-members/invitations/[invitationId]/resend
export const POST = enhanceRouteHandler(resendInvitationEmail, {
  auth: false,
});
