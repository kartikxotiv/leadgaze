import { enhanceRouteHandler } from '@kit/next/routes';

import {
  deleteWorkspaceVariable,
  getWorkspaceVariables,
  saveWorkspaceVariable,
} from './controller';

export const GET = enhanceRouteHandler(getWorkspaceVariables, { auth: false });
export const POST = enhanceRouteHandler(saveWorkspaceVariable, { auth: false });
export const DELETE = enhanceRouteHandler(deleteWorkspaceVariable, {
  auth: false,
});
