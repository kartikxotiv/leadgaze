import { enhanceRouteHandler } from '@kit/next/routes';

import { updateBundleSeats } from './controller';

export const POST = enhanceRouteHandler(updateBundleSeats, { auth: true });
