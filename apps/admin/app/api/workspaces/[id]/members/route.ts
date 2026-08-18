import { enhanceRouteHandler } from '@kit/next/routes';

import { getWorkspaceMembers } from '../../controller';

export const GET = enhanceRouteHandler(getWorkspaceMembers, {
  auth: true,
});
