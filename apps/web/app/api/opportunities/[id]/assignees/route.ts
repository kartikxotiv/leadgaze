import { enhanceRouteHandler } from '@kit/next/routes';

import {
  getOpportunityAssignees,
  assignOpportunityToUser,
  unassignOpportunityFromUser,
} from './controller';

export const GET = enhanceRouteHandler(getOpportunityAssignees, {
  auth: false,
});

export const POST = enhanceRouteHandler(assignOpportunityToUser, {
  auth: false,
});
