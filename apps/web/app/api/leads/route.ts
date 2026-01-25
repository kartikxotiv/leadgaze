import { enhanceRouteHandler } from '@kit/next/routes';

import { createLead, getLeads } from './controller';

export const GET = enhanceRouteHandler(getLeads, {
  auth: false,
});

export const POST = enhanceRouteHandler(createLead, {
  auth: false,
});
