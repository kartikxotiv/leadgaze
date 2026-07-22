import { enhanceRouteHandler } from '@kit/next/routes';

import { getAffectedOpportunities } from '../../../controller';

export const GET = enhanceRouteHandler(getAffectedOpportunities, {
  auth: false,
});

