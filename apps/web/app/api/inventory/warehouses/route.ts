import { getWarehousesController } from '@kit/inventory';
import { enhanceRouteHandler } from '@kit/next/routes';

export const GET = enhanceRouteHandler(getWarehousesController, { auth: false });
