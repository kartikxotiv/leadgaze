import { enhanceRouteHandler } from '@kit/next/routes';

import { reorderLeadStatuses } from '../../controller';

export const PUT = enhanceRouteHandler(reorderLeadStatuses, {
  auth: false,
});
