import { enhanceRouteHandler } from '@kit/next/routes';

import { reassignOpportunityStage } from '../../../controller';

export const PATCH = enhanceRouteHandler(reassignOpportunityStage, {
  auth: false,
});

