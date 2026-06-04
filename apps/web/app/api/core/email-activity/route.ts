import {
  deleteCoreEmailActivityController,
  getCoreEmailActivityController,
  saveCoreEmailActivityController,
} from '@kit/core/apis';
import { enhanceRouteHandler } from '@kit/next/routes';

export const GET = enhanceRouteHandler(getCoreEmailActivityController, { auth: false });
export const POST = enhanceRouteHandler(saveCoreEmailActivityController, { auth: false });
export const DELETE = enhanceRouteHandler(deleteCoreEmailActivityController, { auth: false });
