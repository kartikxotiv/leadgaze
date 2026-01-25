import { enhanceRouteHandler } from '@kit/next/routes';

import { getContacts } from './controller';

export const GET = enhanceRouteHandler(getContacts, {
  auth: false,
});
