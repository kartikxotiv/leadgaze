import { enhanceRouteHandler } from '@kit/next/routes';

import { getRolePermissions, updateRolePermissions } from './controller';

export const GET = enhanceRouteHandler(getRolePermissions, {
  auth: true,
});

export const PUT = enhanceRouteHandler(updateRolePermissions, {
  auth: true,
});
