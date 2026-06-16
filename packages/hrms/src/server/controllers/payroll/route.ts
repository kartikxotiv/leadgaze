import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import {
  createPayrollRunController,
  listPayrollDashboardController,
} from './controller';

const PayrollRunSchema = z.object({
  name: z.string().max(255).optional(),
  period_start: z.string().date(),
  period_end: z.string().date(),
  payment_date: z.string().date().optional().nullable(),
});

export const GET = enhanceRouteHandler(listPayrollDashboardController);

export const POST = enhanceRouteHandler(createPayrollRunController, {
  schema: PayrollRunSchema,
});
