import { enhanceRouteHandler } from '@kit/next/routes';

import { adminAttendanceController } from './controller';

export const GET = enhanceRouteHandler(adminAttendanceController);
