import { googleIntegrationAuthController } from '@kit/core/apis';
import { enhanceRouteHandler } from '@kit/next/routes';

export const GET = enhanceRouteHandler(googleIntegrationAuthController, {
  auth: false,
});
