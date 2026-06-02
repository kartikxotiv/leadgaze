import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import {
  createLeaveRequestController,
  leaveDashboardController,
} from './controller';

const LeaveRequestCreateSchema = z.object({
  leave_type_id: z.string().uuid(),
  from_date: z.string().date(),
  to_date: z.string().date(),
  reason: z.string().max(2000).optional().nullable(),
});

export const GET = enhanceRouteHandler(leaveDashboardController);

export const POST = enhanceRouteHandler(createLeaveRequestController, {
  schema: LeaveRequestCreateSchema,
});
