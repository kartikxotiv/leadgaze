import { enhanceRouteHandler } from '@kit/next/routes';

import { reassignAccountType } from '../../../controller';

export const PATCH = enhanceRouteHandler(reassignAccountType, {
  auth: false,
});

