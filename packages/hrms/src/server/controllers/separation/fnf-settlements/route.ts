import { enhanceRouteHandler } from '@kit/next/routes';

import {
  createFnfSettlementController,
  listFnfSettlementsController,
} from '../controller';

export const GET = enhanceRouteHandler(listFnfSettlementsController);
export const POST = enhanceRouteHandler(createFnfSettlementController);
