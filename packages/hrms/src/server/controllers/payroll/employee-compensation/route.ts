import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import { employeeCompensationController } from './controller';

const EmployeeCompensationSchema = z.object({
  employee_id: z.string().uuid(),
  salary_structure_id: z.string().uuid().optional(),
  assignment_type: z
    .enum(['primary', 'secondary', 'contract', 'retainer'])
    .default('primary'),
  pay_frequency: z
    .enum(['monthly', 'hourly', 'daily', 'one_time'])
    .default('monthly'),
  annual_ctc: z.number().positive().optional(),
  monthly_gross: z.number().positive().optional(),
  effective_from: z.string().date(),
  effective_to: z.string().date().optional(),
  notes: z.string().optional(),
});

export const GET = enhanceRouteHandler(employeeCompensationController.list);

export const POST = enhanceRouteHandler(employeeCompensationController.create, {
  schema: EmployeeCompensationSchema,
});
