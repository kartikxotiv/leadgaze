import { getSettingsController } from '@kit/inventory';
import { enhanceRouteHandler } from '@kit/next/routes';

export const GET = enhanceRouteHandler(getSettingsController, { auth: false });
