import { enhanceRouteHandler } from '@kit/next/routes';

import { createReminder, getReminders } from './controller';

export const GET = enhanceRouteHandler(getReminders, { auth: false });
export const POST = enhanceRouteHandler(createReminder, { auth: false });
