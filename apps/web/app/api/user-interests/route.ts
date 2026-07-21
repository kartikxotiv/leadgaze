import { enhanceRouteHandler } from '@kit/next/routes';

import { recordUserInterest } from './controller';

export const POST = enhanceRouteHandler(recordUserInterest, {
  auth: true,
});

