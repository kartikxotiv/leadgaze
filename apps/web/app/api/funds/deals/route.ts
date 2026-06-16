import { createDealController, deleteDealController, getDealsController, updateDealController } from '@kit/fund-raise';
import { enhanceRouteHandler } from '@kit/next/routes';

export const GET = enhanceRouteHandler(getDealsController, { auth: false });
export const POST = enhanceRouteHandler(createDealController, { auth: false });
export const PATCH = enhanceRouteHandler(updateDealController, { auth: false });
export const DELETE = enhanceRouteHandler(deleteDealController, { auth: false });
