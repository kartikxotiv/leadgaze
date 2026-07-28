import { enhanceRouteHandler } from '@kit/next/routes';

import { getWorkspaces } from './controller';

export const GET = enhanceRouteHandler(getWorkspaces, {
  auth: true,
});
