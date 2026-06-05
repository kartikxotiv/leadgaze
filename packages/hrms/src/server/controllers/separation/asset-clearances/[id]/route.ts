import { enhanceRouteHandler } from '@kit/next/routes';

import {
  deleteAssetClearanceController,
  getAssetClearanceController,
  updateAssetClearanceController,
} from '../../controller';

export const GET = enhanceRouteHandler(getAssetClearanceController);
export const PATCH = enhanceRouteHandler(updateAssetClearanceController);
export const DELETE = enhanceRouteHandler(deleteAssetClearanceController);
