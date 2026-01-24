import { enhanceRouteHandler } from '@kit/next/routes';

import { getMembers, inviteMember } from './controller';

export const GET = enhanceRouteHandler(getMembers, {
  auth: false,
});

export const POST = enhanceRouteHandler(inviteMember, {
  auth: false,
});
