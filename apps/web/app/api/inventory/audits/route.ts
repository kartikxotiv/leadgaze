import { getAuditsController } from '@kit/inventory';
import { enhanceRouteHandler } from '@kit/next/routes';

export const GET = enhanceRouteHandler(getAuditsController, { auth: false });
