import { enhanceRouteHandler } from '@kit/next/routes';

import { createTask, getTasks } from './controller';

export const GET = enhanceRouteHandler(getTasks, { auth: false });
export const POST = enhanceRouteHandler(createTask, { auth: false });
