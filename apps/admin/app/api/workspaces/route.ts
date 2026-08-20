import { enhanceRouteHandler } from '@kit/next/routes';

import { getWorkspaces, createWorkspace } from './controller';

export const GET = enhanceRouteHandler(getWorkspaces, {
  auth: true,
});

export const POST = enhanceRouteHandler(createWorkspace, {
  auth: true,
});
