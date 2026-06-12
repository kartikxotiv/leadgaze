import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import {
  createLeaveTypeController,
  listLeaveTypesController,
} from '../controller';

const LeaveTypeCreateSchema = z.object({
  annual_allocation: z.number().min(0).max(365),
  can_carry_forward: z.boolean().optional(),
  code: z.string().min(2).max(50),
  description: z.string().max(500).optional().nullable(),
  is_active: z.boolean().optional(),
  name: z.string().min(2).max(120),
  requires_hr_approval: z.boolean().optional(),
});

export const GET = enhanceRouteHandler(listLeaveTypesController);

export const POST = enhanceRouteHandler(createLeaveTypeController, {
  schema: LeaveTypeCreateSchema,
});
