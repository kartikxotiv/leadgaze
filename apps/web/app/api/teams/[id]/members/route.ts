import { enhanceRouteHandler } from '@kit/next/routes';

import {
  addTeamMember,
  getTeamMembers,
  removeTeamMember,
  updateTeamMemberRole,
} from './controller';

export const GET = enhanceRouteHandler(getTeamMembers, {
  auth: true,
});

export const POST = enhanceRouteHandler(addTeamMember, {
  auth: true,
});

export const PUT = enhanceRouteHandler(updateTeamMemberRole, {
  auth: true,
});

export const DELETE = enhanceRouteHandler(removeTeamMember, {
  auth: true,
});
