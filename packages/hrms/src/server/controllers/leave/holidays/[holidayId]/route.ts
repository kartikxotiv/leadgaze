import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import {
  deleteLeaveHolidayController,
  updateLeaveHolidayController,
} from '../../controller';

const LeaveHolidayUpdateSchema = z.object({
  holiday_date: z.string().date().optional(),
  name: z.string().min(2).max(160).optional(),
  description: z.string().max(500).optional().nullable(),
  is_optional: z.boolean().optional(),
});

export const PATCH = enhanceRouteHandler(updateLeaveHolidayController, {
  schema: LeaveHolidayUpdateSchema,
});

export const DELETE = enhanceRouteHandler(deleteLeaveHolidayController);
