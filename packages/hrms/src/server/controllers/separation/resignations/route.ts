import { enhanceRouteHandler } from '@kit/next/routes';

import {
  createResignationController,
  listResignationsController,
} from '../controller';

export const GET = enhanceRouteHandler(listResignationsController);
export const POST = enhanceRouteHandler(createResignationController);
