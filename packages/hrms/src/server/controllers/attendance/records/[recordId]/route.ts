import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import { adminUpdateRecordController } from '../../controller';

const AttendanceAdminUpdateSchema = z.object({
  check_in: z.string().datetime().optional().nullable(),
  check_out: z.string().datetime().optional().nullable(),
  shift_id: z.string().uuid().optional().nullable(),
  status: z.enum(['present', 'absent']).optional(),
});

export const PATCH = enhanceRouteHandler(adminUpdateRecordController, {
  schema: AttendanceAdminUpdateSchema,
});
