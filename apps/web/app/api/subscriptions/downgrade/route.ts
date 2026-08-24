import { enhanceRouteHandler } from '@kit/next/routes';

import { downgradeSubscription } from './controller';

export const POST = enhanceRouteHandler(downgradeSubscription, { auth: true });
