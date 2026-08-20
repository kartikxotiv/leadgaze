import { enhanceRouteHandler } from '@kit/next/routes';
import { getWorkspaceAuditLogs } from '../../controller';

export const GET = enhanceRouteHandler(getWorkspaceAuditLogs, {
  auth: true,
});
