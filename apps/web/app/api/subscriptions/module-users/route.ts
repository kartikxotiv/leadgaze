import { enhanceRouteHandler } from '@kit/next/routes';

import {
  assignModuleUser,
  getModuleUsers,
  removeModuleUser,
} from './controller';

export const GET = enhanceRouteHandler(getModuleUsers, { auth: true });
export const POST = enhanceRouteHandler(assignModuleUser, { auth: true });
export const DELETE = enhanceRouteHandler(removeModuleUser, { auth: true });
