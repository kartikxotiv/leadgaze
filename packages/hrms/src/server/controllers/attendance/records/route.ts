import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import { adminUpsertRecordController } from '../controller';

const AttendanceAdminUpsertSchema = z.object({
  employee_id: z.string().uuid(),
  date: z.string().date(),
  check_in: z.string().datetime().optional().nullable(),
  check_out: z.string().datetime().optional().nullable(),
  shift_id: z.string().uuid().optional().nullable(),
  status: z.enum(['present', 'absent']).optional(),
});

export const POST = enhanceRouteHandler(adminUpsertRecordController, {
  schema: AttendanceAdminUpsertSchema,
});
