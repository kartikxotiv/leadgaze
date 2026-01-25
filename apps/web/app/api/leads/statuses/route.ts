import { enhanceRouteHandler } from '@kit/next/routes';

import { getLeadStatuses } from '../controller';

export const GET = enhanceRouteHandler(getLeadStatuses, {
  auth: false,
});
