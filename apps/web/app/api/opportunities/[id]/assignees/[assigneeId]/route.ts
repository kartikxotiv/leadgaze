import { enhanceRouteHandler } from '@kit/next/routes';

import { unassignOpportunityFromUser } from '../controller';

export const DELETE = enhanceRouteHandler(unassignOpportunityFromUser, {
  auth: false,
});
