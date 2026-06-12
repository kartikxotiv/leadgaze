import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import {
  createEmployeeController,
  listEmployeesController,
} from './controller';

const EmployeeCreateSchema = z.object({
  account_id: z.string().uuid().optional().nullable(),
  department_id: z.string().uuid().optional().nullable(),
  shift_id: z.string().uuid().optional().nullable(),
  designation: z.string().max(150).optional().nullable(),
  employee_code: z.string().min(1).max(30),
  employment_type: z
    .enum(['full_time', 'part_time', 'contract', 'intern'])
    .optional(),
  first_name: z.string().min(1).max(100),
  invite_if_missing: z.boolean().optional(),
  joining_date: z.string().date(),
  last_name: z.string().max(100).optional().nullable(),
  manager_employee_id: z.string().uuid().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  role_id: z.string().uuid().optional().nullable(),
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
  work_email: z.string().email(),
});

export const GET = enhanceRouteHandler(listEmployeesController);

export const POST = enhanceRouteHandler(createEmployeeController, {
  schema: EmployeeCreateSchema,
});
