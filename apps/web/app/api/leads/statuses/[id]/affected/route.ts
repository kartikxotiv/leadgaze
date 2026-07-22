import { enhanceRouteHandler } from '@kit/next/routes';

import { getAffectedLeads } from '../../../controller';

export const GET = enhanceRouteHandler(getAffectedLeads, {
  auth: false,
});

