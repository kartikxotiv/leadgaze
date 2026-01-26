import { enhanceRouteHandler } from '@kit/next/routes';

import { createAccount, getAccounts } from './controller';

export const GET = enhanceRouteHandler(getAccounts, {
  auth: true,
});

export const POST = enhanceRouteHandler(createAccount, {
  auth: true,
});
