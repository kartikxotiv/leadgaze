import { enhanceRouteHandler } from '@kit/next/routes';

import { upgradeSubscription } from './controller';

export const POST = enhanceRouteHandler(upgradeSubscription, { auth: true });
