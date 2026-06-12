import { createReminderController, deleteReminderController, getRemindersController, updateReminderController } from '@kit/core/apis';
import { enhanceRouteHandler } from '@kit/next/routes';

export const GET = enhanceRouteHandler(getRemindersController, { auth: false });
export const POST = enhanceRouteHandler(createReminderController, { auth: false });
export const PATCH = enhanceRouteHandler(updateReminderController, { auth: false });
export const DELETE = enhanceRouteHandler(deleteReminderController, { auth: false });
