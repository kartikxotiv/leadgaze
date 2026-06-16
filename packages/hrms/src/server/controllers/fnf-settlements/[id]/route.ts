import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import {
  deleteFnfSettlementController,
  getFnfSettlementController,
  updateFnfSettlementController,
} from '../controller';

const FnfSettlementUpdateSchema = z.object({
  employee_id: z.string().uuid().optional(),
  payroll_run_id: z.string().uuid().optional().nullable(),
  last_working_day: z.string().date().optional(),
  components: z.array(z.unknown()).optional(),
  leave_encashment: z.number().optional(),
  gratuity: z.number().optional(),
  notice_recovery: z.number().optional(),
  total_payable: z.number().optional(),
  tds_on_fnf: z.number().optional(),
  net_payable: z.number().optional(),
  status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PAID', 'REJECTED']).optional(),
  remarks: z.string().optional().nullable(),
  settlement_date: z.string().date().optional().nullable(),
});

export const GET = enhanceRouteHandler(getFnfSettlementController);

export const PATCH = enhanceRouteHandler(updateFnfSettlementController, {
  schema: FnfSettlementUpdateSchema,
});

export const DELETE = enhanceRouteHandler(deleteFnfSettlementController);
