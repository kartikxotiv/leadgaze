import { enhanceRouteHandler } from '@kit/next/routes';

import { updateSeats } from './controller';

export const POST = enhanceRouteHandler(updateSeats, {
  auth: true,
});
