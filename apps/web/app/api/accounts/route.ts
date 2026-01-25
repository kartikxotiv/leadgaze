import { enhanceRouteHandler } from '@kit/next/routes';

import { getAccounts } from './controller';

export const GET = enhanceRouteHandler(getAccounts, {
  auth: false,
});
