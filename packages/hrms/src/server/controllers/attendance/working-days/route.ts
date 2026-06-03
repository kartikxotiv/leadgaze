import { enhanceRouteHandler } from '@kit/next/routes';
import { z } from 'zod';

import {
  getWorkingDaysController,
  updateWorkingDaysController,
} from '../controller';

const workingDaysSchema = z.object({
  working_days: z.array(z.number().int().min(0).max(6)).min(1).max(7),
});

export const GET = enhanceRouteHandler(getWorkingDaysController);
export const PATCH = enhanceRouteHandler(updateWorkingDaysController, {
  schema: workingDaysSchema,
});
