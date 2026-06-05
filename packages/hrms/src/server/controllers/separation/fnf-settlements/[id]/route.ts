import { enhanceRouteHandler } from '@kit/next/routes';

import {
  deleteFnfSettlementController,
  getFnfSettlementController,
  updateFnfSettlementController,
} from '../../controller';

export const GET = enhanceRouteHandler(getFnfSettlementController);
export const PATCH = enhanceRouteHandler(updateFnfSettlementController);
export const DELETE = enhanceRouteHandler(deleteFnfSettlementController);
