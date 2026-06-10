import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import {
  deleteResignationController,
  getResignationController,
  updateResignationController,
} from '../controller';

const ResignationUpdateSchema = z.object({
  employee_id: z.string().uuid().optional(),
  resignation_date: z.string().date().optional(),
  last_working_day: z.string().date().optional().nullable(),
  notice_period_days: z.number().int().min(0).optional().nullable(),
  notice_waiver_days: z.number().int().min(0).optional(),
  reason: z.string().min(1).optional(),
  status: z
    .enum(['SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'RETRACTED'])
    .optional(),
  accepted_by: z.string().uuid().optional().nullable(),
  accepted_at: z.string().datetime().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

export const GET = enhanceRouteHandler(getResignationController);

export const PATCH = enhanceRouteHandler(updateResignationController, {
  schema: ResignationUpdateSchema,
});

export const DELETE = enhanceRouteHandler(deleteResignationController);
