import {
  createServiceCloudResourceController,
  deleteServiceCloudResourceController,
  getServiceCloudResourceController,
  updateServiceCloudResourceController,
} from '@kit/service-cloud';
import { enhanceRouteHandler } from '@kit/next/routes';

export const GET = enhanceRouteHandler(getServiceCloudResourceController, { auth: false });
export const POST = enhanceRouteHandler(createServiceCloudResourceController, { auth: false });
export const PATCH = enhanceRouteHandler(updateServiceCloudResourceController, { auth: false });
export const DELETE = enhanceRouteHandler(deleteServiceCloudResourceController, { auth: false });
