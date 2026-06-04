/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import { salaryStructureController } from '../../controller';

const AddComponentSchema = z.object({
  salary_component_id: z.string().uuid(),
  calculation_type: z.enum([
    'fixed_amount',
    'percentage_of_ctc',
    'percentage_of_gross',
    'percentage_of_basic',
  ]),
  calculation_value: z.number().min(0),
  is_recurring: z.boolean().optional(),
  is_pro_ratable: z.boolean().optional(),
  display_order: z.number().optional(),
});

export const GET = enhanceRouteHandler((ctx) =>
  salaryStructureController.listComponents({
    ...ctx,
    params: ctx.params as any,
  }),
);

export const POST = enhanceRouteHandler(
  (ctx) =>
    salaryStructureController.addComponent({
      ...ctx,
      params: ctx.params as any,
    }),
  {
    schema: AddComponentSchema,
  },
);
