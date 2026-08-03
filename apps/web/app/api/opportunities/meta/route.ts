import { enhanceRouteHandler } from '@kit/next/routes';

import { getOpportunitiesMeta } from './controller';

export const GET = enhanceRouteHandler(getOpportunitiesMeta, {
  auth: false,
});
