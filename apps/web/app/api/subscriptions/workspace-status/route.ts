import { enhanceRouteHandler } from '@kit/next/routes';

import { getWorkspaceStatus } from './controller';

export const GET = enhanceRouteHandler(getWorkspaceStatus, {
  auth: true,
});
