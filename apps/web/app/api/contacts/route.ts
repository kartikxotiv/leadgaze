import { enhanceRouteHandler } from '@kit/next/routes';

import { createContact, getContacts } from './controller';

export const GET = enhanceRouteHandler(getContacts, {
  auth: true,
});

export const POST = enhanceRouteHandler(createContact, {
  auth: true,
});
