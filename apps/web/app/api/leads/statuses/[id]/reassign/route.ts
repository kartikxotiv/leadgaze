import { enhanceRouteHandler } from '@kit/next/routes';

import { reassignLeadStatus } from '../../../controller';

export const PATCH = enhanceRouteHandler(reassignLeadStatus, {
  auth: false,
});

