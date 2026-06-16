import { getProductsController } from '@kit/inventory';
import { enhanceRouteHandler } from '@kit/next/routes';

export const GET = enhanceRouteHandler(getProductsController, { auth: false });
