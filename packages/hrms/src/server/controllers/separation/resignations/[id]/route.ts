import { enhanceRouteHandler } from '@kit/next/routes';

import {
  deleteResignationController,
  getResignationController,
  updateResignationController,
} from '../../controller';

export const GET = enhanceRouteHandler(getResignationController);
export const PATCH = enhanceRouteHandler(updateResignationController);
export const DELETE = enhanceRouteHandler(deleteResignationController);
