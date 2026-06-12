import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import {
  deleteDepartmentController,
  getDepartmentController,
  updateDepartmentController,
} from './controller';

const DepartmentUpdateSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  code: z.string().min(1).max(20).optional(),
  parent_department_id: z.string().uuid().optional().nullable(),
  head_account_id: z.string().uuid().optional().nullable(),
  cost_center_code: z.string().max(50).optional().nullable(),
  is_active: z.boolean().optional(),
});

export const GET = enhanceRouteHandler(getDepartmentController);

export const PATCH = enhanceRouteHandler(updateDepartmentController, {
  schema: DepartmentUpdateSchema,
});

export const DELETE = enhanceRouteHandler(deleteDepartmentController);
