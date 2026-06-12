import { enhanceRouteHandler } from '@kit/next/routes';

import { updateSeatsViaStripe } from './controller';

export const POST = enhanceRouteHandler(updateSeatsViaStripe, {
  auth: true,
});
