import { enhanceRouteHandler } from '@kit/next/routes';

import { getContactById } from './controller';

export const GET = enhanceRouteHandler(getContactById, {
  auth: false,
});
