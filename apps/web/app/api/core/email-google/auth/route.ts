import { coreGoogleAuthController } from '@kit/core/apis';
import { enhanceRouteHandler } from '@kit/next/routes';

export const GET = enhanceRouteHandler(coreGoogleAuthController, { auth: false });
