import { enhanceRouteHandler } from '@kit/next/routes';

import { deleteCall, updateCall } from '../controller';

export const PATCH = enhanceRouteHandler(updateCall, { auth: false });
export const DELETE = enhanceRouteHandler(deleteCall, { auth: false });
