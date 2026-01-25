import { enhanceRouteHandler } from '@kit/next/routes';

import { assignLeadToUser, getLeadAssignees } from './controller';

// GET /api/leads/[id]/assignees
export const GET = enhanceRouteHandler(getLeadAssignees, {
  auth: false,
});

// POST /api/leads/[id]/assignees
export const POST = enhanceRouteHandler(assignLeadToUser, {
  auth: false,
});
