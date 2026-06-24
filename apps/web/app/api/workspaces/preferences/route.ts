import { enhanceRouteHandler } from '@kit/next/routes';

import {
  getWorkspacePreferences,
  updateWorkspacePreferences,
} from './controller';

export const GET = enhanceRouteHandler(getWorkspacePreferences, {
  auth: false,
});

export const PUT = enhanceRouteHandler(updateWorkspacePreferences, {
  auth: false,
});
