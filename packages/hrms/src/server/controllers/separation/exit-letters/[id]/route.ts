import { enhanceRouteHandler } from '@kit/next/routes';

import {
  deleteExitLetterController,
  getExitLetterController,
  updateExitLetterController,
} from '../../controller';

export const GET = enhanceRouteHandler(getExitLetterController);
export const PATCH = enhanceRouteHandler(updateExitLetterController);
export const DELETE = enhanceRouteHandler(deleteExitLetterController);
