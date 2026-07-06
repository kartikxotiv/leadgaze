import { enhanceRouteHandler } from '@kit/next/routes';

import { deleteTask, updateTask } from '../controller';

export const PATCH = enhanceRouteHandler(updateTask, { auth: false });
export const DELETE = enhanceRouteHandler(deleteTask, { auth: false });
