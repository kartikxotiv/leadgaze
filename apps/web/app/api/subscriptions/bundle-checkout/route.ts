import { enhanceRouteHandler } from '@kit/next/routes';

import { createBundleCheckout } from './controller';

export const POST = enhanceRouteHandler(createBundleCheckout, { auth: true });
