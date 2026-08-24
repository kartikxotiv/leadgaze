import { enhanceRouteHandler } from '@kit/next/routes';

import { getWorkspaceIntegrations, disconnectWorkspaceIntegration } from '../../controller';

export const GET = enhanceRouteHandler(getWorkspaceIntegrations, {
  auth: true,
});

export const DELETE = enhanceRouteHandler(disconnectWorkspaceIntegration, {
  auth: true,
});
