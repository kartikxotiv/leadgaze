import { deleteActivityController, getActivitiesController, logActivityController, updateActivityController } from '@kit/core/apis';
import { enhanceRouteHandler } from '@kit/next/routes';

export const GET = enhanceRouteHandler(getActivitiesController, { auth: false });
export const POST = enhanceRouteHandler(logActivityController, { auth: false });
export const PATCH = enhanceRouteHandler(updateActivityController, { auth: false });
export const DELETE = enhanceRouteHandler(deleteActivityController, { auth: false });
