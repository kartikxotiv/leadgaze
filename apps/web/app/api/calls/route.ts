import { enhanceRouteHandler } from '@kit/next/routes';

import { createCall, getCalls } from './controller';

export const GET = enhanceRouteHandler(getCalls, { auth: false });
export const POST = enhanceRouteHandler(createCall, { auth: false });
