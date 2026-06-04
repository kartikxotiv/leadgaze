/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import { employeeCompensationController } from '../controller';

const UpdateEmployeeCompensationSchema = z.object({
  assignment_type: z.string().optional(),
  pay_frequency: z.string().optional(),
  annual_ctc: z.number().optional(),
  monthly_gross: z.number().optional(),
  effective_from: z.string().optional(),
  effective_to: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.string().optional(),
});

export const PATCH = enhanceRouteHandler(
  (ctx) =>
    employeeCompensationController.update({
      ...ctx,
      params: ctx.params as any,
    }),
  { schema: UpdateEmployeeCompensationSchema },
);

export const DELETE = enhanceRouteHandler((ctx) =>
  employeeCompensationController.delete({ ...ctx, params: ctx.params as any }),
);
