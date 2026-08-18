import { enhanceRouteHandler } from '@kit/next/routes';

import { updateWorkspace, getWorkspaceById } from '../controller';

export const GET = enhanceRouteHandler(getWorkspaceById, {
  auth: true,
});

export const PATCH = enhanceRouteHandler(updateWorkspace, {
  auth: true,
});
