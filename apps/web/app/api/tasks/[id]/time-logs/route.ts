import { enhanceRouteHandler } from '@kit/next/routes';

import { createTimeLog, getTimeLogs } from '../../controller';

export const GET = enhanceRouteHandler(getTimeLogs, { auth: false });
export const POST = enhanceRouteHandler(createTimeLog, { auth: false });
