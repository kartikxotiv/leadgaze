import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import { createShiftController, listShiftsController } from './controller';

const ShiftCreateSchema = z.object({
  name: z.string().min(2).max(200),
  start_time: z.string().min(1).optional().nullable(),
  end_time: z.string().min(1).optional().nullable(),
  grace_minutes: z.number().int().min(0).max(240).optional().nullable(),
  is_active: z.boolean().optional(),
});

export const GET = enhanceRouteHandler(listShiftsController);

export const POST = enhanceRouteHandler(createShiftController, {
  schema: ShiftCreateSchema,
});
