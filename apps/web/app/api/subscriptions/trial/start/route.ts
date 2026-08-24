import { enhanceRouteHandler } from '@kit/next/routes';

import { startSubscriptionTrial } from './controller';

export const POST = enhanceRouteHandler(startSubscriptionTrial, { auth: true });
