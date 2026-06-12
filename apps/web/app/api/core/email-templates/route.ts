import {
  deleteCoreEmailTemplateController,
  getCoreEmailTemplatesController,
  saveCoreEmailTemplateController,
} from '@kit/core/apis';
import { enhanceRouteHandler } from '@kit/next/routes';

export const GET = enhanceRouteHandler(getCoreEmailTemplatesController, { auth: false });
export const POST = enhanceRouteHandler(saveCoreEmailTemplateController, { auth: false });
export const DELETE = enhanceRouteHandler(deleteCoreEmailTemplateController, { auth: false });
