import { enhanceRouteHandler } from '@kit/next/routes';

import { getOpportunities } from './controller';

export const GET = enhanceRouteHandler(getOpportunities, {
  auth: false,
});
