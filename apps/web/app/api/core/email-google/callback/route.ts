import { coreGoogleCallbackController } from '@kit/core/apis';
import { enhanceRouteHandler } from '@kit/next/routes';

export const GET = enhanceRouteHandler(coreGoogleCallbackController, { auth: false });
