import { enhanceRouteHandler } from '@kit/next/routes';

import { deleteReminder } from '../controller';

export const DELETE = enhanceRouteHandler(deleteReminder, { auth: false });
