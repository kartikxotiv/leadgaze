import { enhanceRouteHandler } from '@kit/next/routes';

import { reorderOpportunityStages } from '../../controller';

export const PUT = enhanceRouteHandler(reorderOpportunityStages, {
  auth: false,
});
