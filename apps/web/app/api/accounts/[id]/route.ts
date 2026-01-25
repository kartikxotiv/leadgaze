import { enhanceRouteHandler } from '@kit/next/routes';

import { getAccountById } from './controller';

export const GET = enhanceRouteHandler(getAccountById, {
  auth: false,
});
