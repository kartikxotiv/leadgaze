import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import { deleteShiftController, updateShiftController } from '../controller';

const ShiftUpdateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  start_time: z.string().min(1).optional().nullable(),
  end_time: z.string().min(1).optional().nullable(),
  grace_minutes: z.number().int().min(0).max(240).optional().nullable(),
  is_active: z.boolean().optional(),
});

export const PATCH = enhanceRouteHandler(updateShiftController, {
  schema: ShiftUpdateSchema,
});

export const DELETE = enhanceRouteHandler(deleteShiftController);
