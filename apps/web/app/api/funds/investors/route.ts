import { createInvestorController, deleteInvestorController, getInvestorsController, updateInvestorController } from '@kit/fund-raise';
import { enhanceRouteHandler } from '@kit/next/routes';

export const GET = enhanceRouteHandler(getInvestorsController, { auth: false });
export const POST = enhanceRouteHandler(createInvestorController, { auth: false });
export const PATCH = enhanceRouteHandler(updateInvestorController, { auth: false });
export const DELETE = enhanceRouteHandler(deleteInvestorController, { auth: false });
