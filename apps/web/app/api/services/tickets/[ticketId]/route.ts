import { getServiceCloudTicketDetailController } from '@kit/service-cloud';
import { enhanceRouteHandler } from '@kit/next/routes';

export const GET = enhanceRouteHandler(getServiceCloudTicketDetailController, { auth: false });
