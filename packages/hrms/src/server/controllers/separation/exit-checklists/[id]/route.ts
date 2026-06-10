import { enhanceRouteHandler } from '@kit/next/routes';

import {
  deleteExitChecklistController,
  getExitChecklistController,
  updateExitChecklistController,
} from '../../controller';

export const GET = enhanceRouteHandler(getExitChecklistController);
export const PATCH = enhanceRouteHandler(updateExitChecklistController);
export const DELETE = enhanceRouteHandler(deleteExitChecklistController);
