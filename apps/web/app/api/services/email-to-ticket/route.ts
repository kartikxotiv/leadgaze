import { convertCoreEmailToServiceCloudTicketController } from '@kit/service-cloud';
import { enhanceRouteHandler } from '@kit/next/routes';

export const POST = enhanceRouteHandler(convertCoreEmailToServiceCloudTicketController, { auth: false });
