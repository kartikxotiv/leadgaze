import { enhanceRouteHandler } from '@kit/next/routes';
import { getServiceCloudTicketLookupsController } from '@kit/service-cloud';

export const GET = enhanceRouteHandler(getServiceCloudTicketLookupsController, {
  auth: false,
});
