import { enhanceRouteHandler } from '@kit/next/routes';

import {
  createExitChecklistItemController,
  listExitChecklistItemsController,
} from '../controller';

export const GET = enhanceRouteHandler(listExitChecklistItemsController);
export const POST = enhanceRouteHandler(createExitChecklistItemController);
