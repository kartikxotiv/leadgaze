import { enhanceRouteHandler } from '@kit/next/routes';

import {
  deleteEmailActivity,
  getEmailActivity,
  saveEmailActivity,
} from './controller';

export const GET = enhanceRouteHandler(getEmailActivity, { auth: false });
export const POST = enhanceRouteHandler(saveEmailActivity, { auth: false });
export const DELETE = enhanceRouteHandler(deleteEmailActivity, { auth: false });
