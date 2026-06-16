import { enhanceRouteHandler } from '@kit/next/routes';

import { deleteInvitation } from '../../controller';

// Route pattern: DELETE /api/team-members/invitations/[invitationId]
export const DELETE = enhanceRouteHandler(deleteInvitation, {
  auth: false,
});
