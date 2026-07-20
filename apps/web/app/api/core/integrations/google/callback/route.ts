import { googleIntegrationCallbackController } from '@kit/core/apis';
import { enhanceRouteHandler } from '@kit/next/routes';

export const dynamic = 'force-dynamic';

export const GET = enhanceRouteHandler(googleIntegrationCallbackController, {
  auth: false,
});
