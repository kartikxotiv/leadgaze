import { enhanceRouteHandler } from '@kit/next/routes';

import { convertLead } from './controller';

export const POST = enhanceRouteHandler(convertLead, {
  auth: false,
});
