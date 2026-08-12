import { enhanceRouteHandler } from '@kit/next/routes';

import { getLeadsMeta } from './controller';

export const GET = enhanceRouteHandler(getLeadsMeta, {
  auth: false,
});
