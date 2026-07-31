import { enhanceRouteHandler } from '@kit/next/routes';

import { getAffectedAccounts } from '../../../controller';

export const GET = enhanceRouteHandler(getAffectedAccounts, {
  auth: false,
});

