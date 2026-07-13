import {
  createIntegrationConnectionController,
  deleteIntegrationConnectionController,
  getIntegrationConnectionsController,
} from '@kit/core/apis';
import { enhanceRouteHandler } from '@kit/next/routes';

export const GET = enhanceRouteHandler(getIntegrationConnectionsController, {
  auth: false,
});
export const POST = enhanceRouteHandler(createIntegrationConnectionController, {
  auth: false,
});
export const DELETE = enhanceRouteHandler(
  deleteIntegrationConnectionController,
  { auth: false },
);
