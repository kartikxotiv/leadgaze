import { getStockController } from '@kit/inventory';
import { enhanceRouteHandler } from '@kit/next/routes';

export const GET = enhanceRouteHandler(getStockController, { auth: false });
