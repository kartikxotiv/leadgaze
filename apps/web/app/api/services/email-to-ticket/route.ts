import { enhanceRouteHandler } from '@kit/next/routes';

import { convertEntitledEmailToTicket } from './entitlement-controller';

export const POST = enhanceRouteHandler(convertEntitledEmailToTicket, {
  auth: false,
});
