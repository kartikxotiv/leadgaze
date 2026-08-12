import { enhanceRouteHandler } from '@kit/next/routes';

import { reorderAccountTypes } from '../../controller';

export const PUT = enhanceRouteHandler(reorderAccountTypes, {
  auth: false,
});
