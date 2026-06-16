import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import {
  createFnfSettlementController,
  listFnfSettlementsController,
} from './controller';

const FnfSettlementCreateSchema = z.object({
  employee_id: z.string().uuid(),
  payroll_run_id: z.string().uuid().optional().nullable(),
  last_working_day: z.string().date(),
  components: z.array(z.unknown()).optional(),
  leave_encashment: z.number().optional(),
  gratuity: z.number().optional(),
  notice_recovery: z.number().optional(),
  total_payable: z.number().optional(),
  tds_on_fnf: z.number().optional(),
  net_payable: z.number().optional(),
  status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PAID', 'REJECTED']).optional(),
  settlement_date: z.string().date().optional().nullable(),
});

export const GET = enhanceRouteHandler(listFnfSettlementsController);

export const POST = enhanceRouteHandler(createFnfSettlementController, {
  schema: FnfSettlementCreateSchema,
});
