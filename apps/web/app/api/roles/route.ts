import { enhanceRouteHandler } from '@kit/next/routes';

import { createRole, getAllRoles, getModulesWithFeatures } from './controller';

export const GET = enhanceRouteHandler(getAllRoles, {
  auth: false,
});

export const POST = enhanceRouteHandler(createRole, {
  auth: false,
});
