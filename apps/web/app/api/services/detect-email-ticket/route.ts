import { enhanceRouteHandler } from '@kit/next/routes';
import { detectEmailTicketController } from '@kit/service-cloud';

export const GET = enhanceRouteHandler(detectEmailTicketController, {
  auth: false,
});
