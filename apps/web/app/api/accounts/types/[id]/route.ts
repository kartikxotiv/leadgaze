import { enhanceRouteHandler } from '@kit/next/routes';

import { updateAccountType, deleteAccountType } from '../../../controller';

export const PATCH = enhanceRouteHandler(updateAccountType, {
  auth: false,
});

export const DELETE = enhanceRouteHandler(deleteAccountType, {
  auth: false,
});
