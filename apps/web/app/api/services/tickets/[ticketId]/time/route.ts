import { logServiceCloudTicketTimeController } from '@kit/service-cloud';
import { enhanceRouteHandler } from '@kit/next/routes';

export const POST = enhanceRouteHandler(logServiceCloudTicketTimeController, { auth: false });
