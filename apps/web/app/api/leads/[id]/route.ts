import { enhanceRouteHandler } from '@kit/next/routes';

import { deleteLead, getLeadById, updateLead } from './controller';

export const GET = enhanceRouteHandler(getLeadById, {
  auth: false,
});

export const PATCH = enhanceRouteHandler(updateLead, {
  auth: false,
});

export const DELETE = enhanceRouteHandler(deleteLead, {
  auth: false,
});
