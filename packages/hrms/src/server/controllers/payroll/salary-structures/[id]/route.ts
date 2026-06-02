/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import { salaryStructureController } from '../controller';

const UpdateSalaryStructureSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  currency_code: z.string().optional(),
  is_active: z.boolean().optional(),
});

export const PATCH = enhanceRouteHandler(
  (ctx) =>
    salaryStructureController.update({ ...ctx, params: ctx.params as any }),
  { schema: UpdateSalaryStructureSchema },
);

export const DELETE = enhanceRouteHandler((ctx) =>
  salaryStructureController.delete({ ...ctx, params: ctx.params as any }),
);
