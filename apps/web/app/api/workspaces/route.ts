import { enhanceRouteHandler } from '@kit/next/routes';

import { createNewWorkspace } from './controller';

export const POST = enhanceRouteHandler(createNewWorkspace, {
  auth: false,
});
