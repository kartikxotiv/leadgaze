import { enhanceRouteHandler } from '@kit/next/routes';

import { getWorkspaceModules } from '../../controller';

export const GET = enhanceRouteHandler(getWorkspaceModules, {
  auth: true,
});
