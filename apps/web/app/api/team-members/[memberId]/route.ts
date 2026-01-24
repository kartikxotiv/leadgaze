import { enhanceRouteHandler } from '@kit/next/routes';

import {
  getMemberById,
  updateMember,
  removeMember,
  resendInvitation,
} from '../controller';

// Route pattern: /api/team-members/[memberId]
export const GET = enhanceRouteHandler(getMemberById, {
  auth: false,
});

export const PUT = enhanceRouteHandler(updateMember, {
  auth: false,
});

export const DELETE = enhanceRouteHandler(removeMember, {
  auth: false,
});
