import { enhanceRouteHandler } from '@kit/next/routes';

import {
  createExitChecklistController,
  listExitChecklistsController,
} from '../controller';

export const GET = enhanceRouteHandler(listExitChecklistsController);
export const POST = enhanceRouteHandler(createExitChecklistController);
