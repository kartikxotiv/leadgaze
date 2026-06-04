import { enhanceRouteHandler } from '@kit/next/routes';

import { myAttendanceController } from '../controller';

export const GET = enhanceRouteHandler(myAttendanceController);
