import { enhanceRouteHandler } from '@kit/next/routes';

import { getAccountTypes, createAccountType } from '../controller';

export const GET = enhanceRouteHandler(getAccountTypes, {
  auth: false,
});

export const POST = enhanceRouteHandler(createAccountType, {
  auth: false,
});
