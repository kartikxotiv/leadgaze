import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import { salaryStructureController } from './controller';

const SalaryStructureSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  currency_code: z.string().length(3, 'Currency code must be 3 characters'),
  is_active: z.boolean().default(true),
});

export const GET = enhanceRouteHandler(salaryStructureController.list);

export const POST = enhanceRouteHandler(salaryStructureController.create, {
  schema: SalaryStructureSchema,
});
