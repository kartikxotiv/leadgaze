import { enhanceRouteHandler } from '@kit/next/routes';

import { getWorkspaceSeats, updateWorkspaceSeats } from './controller';

export const GET = enhanceRouteHandler(getWorkspaceSeats, {
  auth: true,
});

export const PUT = enhanceRouteHandler(updateWorkspaceSeats, {
  auth: true,
});
