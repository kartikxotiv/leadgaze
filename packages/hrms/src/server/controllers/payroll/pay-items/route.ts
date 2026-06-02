import { z } from 'zod';
import { enhanceRouteHandler } from '@kit/next/routes';
import { employeePayItemController } from './controller';

const CreatePayItemSchema = z.object({
  employee_id: z.string().uuid(),
  salary_component_id: z.string().uuid(),
  amount: z.number(),
  effective_date: z.string(),
  notes: z.string().optional(),
});

export const POST = enhanceRouteHandler(employeePayItemController.create, {
  schema: CreatePayItemSchema,
});
