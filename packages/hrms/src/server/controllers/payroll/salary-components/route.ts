import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import { salaryComponentController } from './controller';

const SalaryComponentSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['earning', 'deduction', 'employer_contribution']),
  taxable: z.boolean().default(false),
  is_statutory: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export const GET = enhanceRouteHandler(salaryComponentController.list);

export const POST = enhanceRouteHandler(salaryComponentController.create, {
  schema: SalaryComponentSchema,
});
