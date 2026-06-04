import {
  createCoreSmtpAccountController,
  deleteCoreEmailAccountController,
  getCoreEmailAccountsController,
  updateCoreEmailAccountController,
} from '@kit/core/apis';
import { enhanceRouteHandler } from '@kit/next/routes';

export const GET = enhanceRouteHandler(getCoreEmailAccountsController, { auth: false });
export const POST = enhanceRouteHandler(createCoreSmtpAccountController, { auth: false });
export const PATCH = enhanceRouteHandler(updateCoreEmailAccountController, { auth: false });
export const DELETE = enhanceRouteHandler(deleteCoreEmailAccountController, { auth: false });
