import { enhanceRouteHandler } from '@kit/next/routes';

import { unassignLeadFromUser } from '../controller';

// DELETE /api/leads/[id]/assignees/[assigneeId]
export const DELETE = enhanceRouteHandler(unassignLeadFromUser, {
  auth: false,
});
