import { getServiceCloudDashboardController } from '@kit/service-cloud';
import { enhanceRouteHandler } from '@kit/next/routes';

export const GET = enhanceRouteHandler(getServiceCloudDashboardController, { auth: false });
