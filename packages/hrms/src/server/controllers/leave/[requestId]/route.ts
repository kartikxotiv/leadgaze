import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import { updateLeaveRequestController } from '../controller';

const LeaveRequestActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'cancel']),
  decision_note: z.string().max(2000).optional().nullable(),
});

export const PATCH = enhanceRouteHandler(updateLeaveRequestController, {
  schema: LeaveRequestActionSchema,
});
