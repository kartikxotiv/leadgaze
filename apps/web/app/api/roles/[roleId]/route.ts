import { enhanceRouteHandler } from '@kit/next/routes';

import { deleteRole, getRoleById, updateRole } from './controller';

export const GET = enhanceRouteHandler(getRoleById, {
  auth: false,
});

export const PUT = enhanceRouteHandler(updateRole, {
  auth: false,
});

export const DELETE = enhanceRouteHandler(deleteRole, {
  auth: false,
});
