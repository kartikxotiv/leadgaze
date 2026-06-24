import { zoomIntegrationCallbackController } from '@kit/core/apis';
import { enhanceRouteHandler } from '@kit/next/routes';

export const GET = enhanceRouteHandler(zoomIntegrationCallbackController, {
  auth: false,
});
