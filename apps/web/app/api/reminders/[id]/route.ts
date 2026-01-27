import { enhanceRouteHandler } from '@kit/next/routes';

import { deleteReminder, updateReminder } from '../controller';

export const PATCH = enhanceRouteHandler(updateReminder, { auth: false });
export const DELETE = enhanceRouteHandler(deleteReminder, { auth: false });
