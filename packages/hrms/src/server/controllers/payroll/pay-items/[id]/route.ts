/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import { employeePayItemController } from '../controller';

const UpdatePayItemSchema = z.object({
  amount: z.number().optional(),
  effective_date: z.string().optional(),
  notes: z.string().nullable().optional(),
});

export const PATCH = enhanceRouteHandler(
  (ctx) =>
    employeePayItemController.update({ ...ctx, params: ctx.params as any }),
  { schema: UpdatePayItemSchema },
);

export const DELETE = enhanceRouteHandler((ctx) =>
  employeePayItemController.delete({ ...ctx, params: ctx.params as any }),
);
