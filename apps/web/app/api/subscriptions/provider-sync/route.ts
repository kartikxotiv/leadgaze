import { enhanceRouteHandler } from '@kit/next/routes';

import { synchronizeProvider } from './controller';

export const POST = enhanceRouteHandler(synchronizeProvider, { auth: true });
