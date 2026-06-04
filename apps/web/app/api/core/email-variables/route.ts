import {
  deleteCoreEmailVariableController,
  getCoreEmailVariablesController,
  saveCoreEmailVariableController,
} from '@kit/core/apis';
import { enhanceRouteHandler } from '@kit/next/routes';

export const GET = enhanceRouteHandler(getCoreEmailVariablesController, { auth: false });
export const POST = enhanceRouteHandler(saveCoreEmailVariableController, { auth: false });
export const DELETE = enhanceRouteHandler(deleteCoreEmailVariableController, { auth: false });
