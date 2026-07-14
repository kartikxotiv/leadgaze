import { enhanceRouteHandler } from '@kit/next/routes';

import { updateLeadStatus, deleteLeadStatus } from '../../controller';

export const PATCH = enhanceRouteHandler(updateLeadStatus, {
  auth: false,
});

export const DELETE = enhanceRouteHandler(deleteLeadStatus, {
  auth: false,
});
