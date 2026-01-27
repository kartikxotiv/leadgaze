import { enhanceRouteHandler } from '@kit/next/routes';

import { deleteMeeting, updateMeeting } from '../controller';

export const PATCH = enhanceRouteHandler(updateMeeting, { auth: false });
export const DELETE = enhanceRouteHandler(deleteMeeting, { auth: false });
