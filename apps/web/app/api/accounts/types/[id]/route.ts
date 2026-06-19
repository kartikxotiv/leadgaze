import { enhanceRouteHandler } from '@kit/next/routes';

import { deleteAccountType, updateAccountType } from '../../controller';

export const PATCH = enhanceRouteHandler(updateAccountType, {
  auth: false,
});

export const DELETE = enhanceRouteHandler(deleteAccountType, {
  auth: false,
});
