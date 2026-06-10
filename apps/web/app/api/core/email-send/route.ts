import { sendCoreEmailController } from '@kit/core/apis';
import { enhanceRouteHandler } from '@kit/next/routes';

export const POST = enhanceRouteHandler(sendCoreEmailController, { auth: false });
