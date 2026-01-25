import { enhanceRouteHandler } from '@kit/next/routes';

import { getOpportunityById } from './controller';

export const GET = enhanceRouteHandler(getOpportunityById, {
  auth: false,
});
