import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import {
  createAssetClearanceController,
  listAssetClearancesController,
} from './controller';

const AssetClearanceCreateSchema = z.object({
  employee_id: z.string().uuid(),
  resignation_id: z.string().uuid().optional().nullable(),
  asset_name: z.string().min(1).max(255),
  asset_tag: z.string().max(100).optional().nullable(),
  issued_date: z.string().date().optional().nullable(),
  returned_date: z.string().date().optional().nullable(),
  condition_at_return: z
    .enum(['PENDING', 'GOOD', 'DAMAGED', 'LOST'])
    .optional(),
  remarks: z.string().optional().nullable(),
  status: z.enum(['PENDING', 'RETURNED', 'WAIVED']).optional(),
  cleared_by: z.string().uuid().optional().nullable(),
  cleared_at: z.string().datetime().optional().nullable(),
});

export const GET = enhanceRouteHandler(listAssetClearancesController);

export const POST = enhanceRouteHandler(createAssetClearanceController, {
  schema: AssetClearanceCreateSchema,
});
