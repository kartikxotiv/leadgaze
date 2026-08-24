import { enhanceRouteHandler } from '@kit/next/routes';
import {
  getServiceCloudResourceController,
  updateServiceCloudResourceController,
} from '@kit/service-cloud';

import {
  createEntitledServiceCloudResource,
  deleteEntitledServiceCloudResource,
} from './entitlement-controller';

export const GET = enhanceRouteHandler(getServiceCloudResourceController, {
  auth: false,
});
export const POST = enhanceRouteHandler(createEntitledServiceCloudResource, {
  auth: false,
});
export const PATCH = enhanceRouteHandler(updateServiceCloudResourceController, {
  auth: false,
});
export const DELETE = enhanceRouteHandler(deleteEntitledServiceCloudResource, {
  auth: false,
});
