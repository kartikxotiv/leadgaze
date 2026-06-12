import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import {
  createDepartmentController,
  listDepartmentsController,
} from './controller';

const DepartmentCreateSchema = z.object({
  name: z.string().min(2).max(150),
  code: z.string().min(1).max(20),
  parent_department_id: z.string().uuid().optional().nullable(),
  head_account_id: z.string().uuid().optional().nullable(),
  cost_center_code: z.string().max(50).optional().nullable(),
  is_active: z.boolean().optional(),
});

export const GET = enhanceRouteHandler(listDepartmentsController);

export const POST = enhanceRouteHandler(createDepartmentController, {
  schema: DepartmentCreateSchema,
});
