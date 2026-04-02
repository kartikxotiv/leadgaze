import { enhanceRouteHandler } from '@kit/next/routes';

import {
  deleteEmailTemplate,
  getEmailTemplates,
  saveEmailTemplate,
} from './controller';

export const GET = enhanceRouteHandler(getEmailTemplates, { auth: false });
export const POST = enhanceRouteHandler(saveEmailTemplate, { auth: false });
export const DELETE = enhanceRouteHandler(deleteEmailTemplate, { auth: false });
