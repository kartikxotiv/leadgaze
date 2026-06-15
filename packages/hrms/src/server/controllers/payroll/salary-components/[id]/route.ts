/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import { salaryComponentController } from '../controller';

const UpdateSalaryComponentSchema = z.object({
  code: z.string().optional(),
  name: z.string().optional(),
  type: z.enum(['earning', 'deduction', 'employer_contribution']).optional(),
  taxable: z.boolean().optional(),
  is_statutory: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export const PATCH = enhanceRouteHandler(
  (ctx) =>
    salaryComponentController.update({ ...ctx, params: ctx.params as any }),
  { schema: UpdateSalaryComponentSchema },
);

export const DELETE = enhanceRouteHandler((ctx) =>
  salaryComponentController.delete({ ...ctx, params: ctx.params as any }),
);
