import { enhanceRouteHandler } from '@kit/next/routes';

import { createOpportunity, getOpportunities } from './controller';

export const GET = enhanceRouteHandler(getOpportunities, {
  auth: false,
});

export const POST = enhanceRouteHandler(createOpportunity, {
  auth: false,
});
