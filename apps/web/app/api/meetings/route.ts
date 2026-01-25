import { enhanceRouteHandler } from '@kit/next/routes';

import { createMeeting, getMeetings } from './controller';

export const GET = enhanceRouteHandler(getMeetings, { auth: false });
export const POST = enhanceRouteHandler(createMeeting, { auth: false });
