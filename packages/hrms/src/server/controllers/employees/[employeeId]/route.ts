import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import {
  deleteEmployeeController,
  getEmployeeController,
  updateEmployeeController,
} from '../controller';

const EmployeeUpdateSchema = z.object({
  account_id: z.string().uuid().optional().nullable(),
  department_id: z.string().uuid().optional().nullable(),
  shift_id: z.string().uuid().optional().nullable(),
  designation: z.string().max(150).optional().nullable(),
  employee_code: z.string().min(1).max(30).optional(),
  employment_type: z
    .enum(['full_time', 'part_time', 'contract', 'intern'])
    .optional(),
  first_name: z.string().min(1).max(100).optional(),
  joining_date: z.string().date().optional().nullable(),
  last_name: z.string().max(100).optional().nullable(),
  manager_employee_id: z.string().uuid().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  status: z
    .enum([
      'invited',
      'active',
      'probation',
      'notice_period',
      'inactive',
      'exited',
    ])
    .optional(),
  work_email: z.string().email().optional(),
  role_id: z.string().uuid().optional(),
});

export const GET = enhanceRouteHandler(getEmployeeController);

export const PATCH = enhanceRouteHandler(updateEmployeeController, {
  schema: EmployeeUpdateSchema,
});

export const DELETE = enhanceRouteHandler(deleteEmployeeController);
