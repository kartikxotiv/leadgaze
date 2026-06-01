import { createInvestorContactController, deleteInvestorContactController, getInvestorContactsController, updateInvestorContactController } from '@kit/fund-raise';
import { enhanceRouteHandler } from '@kit/next/routes';

export const GET = enhanceRouteHandler(getInvestorContactsController, { auth: false });
export const POST = enhanceRouteHandler(createInvestorContactController, { auth: false });
export const PATCH = enhanceRouteHandler(updateInvestorContactController, { auth: false });
export const DELETE = enhanceRouteHandler(deleteInvestorContactController, { auth: false });
