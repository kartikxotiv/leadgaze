import { enhanceRouteHandler } from '@kit/next/routes';

import { getRoles, createRole } from './controller';

export const GET = enhanceRouteHandler(getRoles, {
  auth: true,
});

export const POST = enhanceRouteHandler(createRole, {
  auth: true,
});
