import { enhanceRouteHandler } from '@kit/next/routes';

import { getEntitlementContext } from './controller';

export const GET = enhanceRouteHandler(getEntitlementContext, { auth: true });
