import { enhanceRouteHandler } from '@kit/next/routes';

import { getPendingInvitations } from '../controller';

// Route pattern: GET /api/team-members/invitations?workspaceId=xxx
export const GET = enhanceRouteHandler(getPendingInvitations, {
  auth: false,
});
