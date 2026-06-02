import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import {
  deleteLeaveTypeController,
  updateLeaveTypeController,
} from '../../controller';

const LeaveTypeUpdateSchema = z.object({
  annual_allocation: z.number().min(0).max(365).optional(),
  can_carry_forward: z.boolean().optional(),
  code: z.string().min(2).max(50).optional(),
  description: z.string().max(500).optional().nullable(),
  is_active: z.boolean().optional(),
  name: z.string().min(2).max(120).optional(),
  requires_hr_approval: z.boolean().optional(),
});

export const PATCH = enhanceRouteHandler(updateLeaveTypeController, {
  schema: LeaveTypeUpdateSchema,
});

export const DELETE = enhanceRouteHandler(deleteLeaveTypeController);
