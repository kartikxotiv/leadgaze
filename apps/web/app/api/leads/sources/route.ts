import { enhanceRouteHandler } from '@kit/next/routes';

import { getLeadSources } from '../controller';

export const GET = enhanceRouteHandler(getLeadSources, {
  auth: false,
});
