import { enhanceRouteHandler } from '@kit/next/routes';

import {
  createAssetClearanceController,
  listAssetClearancesController,
} from '../controller';

export const GET = enhanceRouteHandler(listAssetClearancesController);
export const POST = enhanceRouteHandler(createAssetClearanceController);
