import { enhanceRouteHandler } from '@kit/next/routes';

import { deleteTeam, updateTeam } from './controller';

export const PUT = enhanceRouteHandler(updateTeam, {
  auth: true,
});

export const DELETE = enhanceRouteHandler(deleteTeam, {
  auth: true,
});
