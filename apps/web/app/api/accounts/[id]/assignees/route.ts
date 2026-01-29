import { enhanceRouteHandler } from '@kit/next/routes';

import {
  getAccountAssignees,
  assignAccountToUser,
  unassignAccountFromUser,
} from './controller';

export const GET = enhanceRouteHandler(getAccountAssignees, {
  auth: false,
});

export const POST = enhanceRouteHandler(assignAccountToUser, {
  auth: false,
});
