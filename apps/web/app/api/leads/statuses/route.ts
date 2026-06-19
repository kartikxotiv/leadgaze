import { enhanceRouteHandler } from '@kit/next/routes';

import { getLeadStatuses, createLeadStatus } from '../controller';

export const GET = enhanceRouteHandler(getLeadStatuses, {
  auth: false,
});

export const POST = enhanceRouteHandler(createLeadStatus, {
  auth: false,
});
