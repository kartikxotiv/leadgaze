import { enhanceRouteHandler } from '@kit/next/routes';

import { getWorkspaceUsageAnalytics } from '../../controller';

export const GET = enhanceRouteHandler(getWorkspaceUsageAnalytics, {
  auth: true,
});
