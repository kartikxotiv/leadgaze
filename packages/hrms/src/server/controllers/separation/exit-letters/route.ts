import { enhanceRouteHandler } from '@kit/next/routes';

import {
  createExitLetterController,
  listExitLettersController,
} from '../controller';

export const GET = enhanceRouteHandler(listExitLettersController);
export const POST = enhanceRouteHandler(createExitLetterController);
