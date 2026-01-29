import { enhanceRouteHandler } from '@kit/next/routes';

import {
  getContactAssignees,
  assignContactToUser,
  unassignContactFromUser,
} from './controller';

export const GET = enhanceRouteHandler(getContactAssignees, {
  auth: false,
});

export const POST = enhanceRouteHandler(assignContactToUser, {
  auth: false,
});
