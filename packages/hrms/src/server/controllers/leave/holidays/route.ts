import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import {
  createLeaveHolidayController,
  listLeaveHolidaysController,
} from '../controller';

const LeaveHolidayCreateSchema = z.object({
  holiday_date: z.string().date(),
  name: z.string().min(2).max(160),
  description: z.string().max(500).optional().nullable(),
  is_optional: z.boolean().optional(),
});

export const GET = enhanceRouteHandler(listLeaveHolidaysController);

export const POST = enhanceRouteHandler(createLeaveHolidayController, {
  schema: LeaveHolidayCreateSchema,
});
