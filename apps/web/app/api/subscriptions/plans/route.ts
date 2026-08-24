import { enhanceRouteHandler } from '@kit/next/routes';

import { getWorkspacePlans } from './controller';

export const GET = enhanceRouteHandler(getWorkspacePlans, { auth: true });
