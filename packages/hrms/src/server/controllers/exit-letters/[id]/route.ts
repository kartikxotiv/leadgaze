import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import {
  deleteExitLetterController,
  getExitLetterController,
  updateExitLetterController,
} from '../controller';

const ExitLetterUpdateSchema = z.object({
  employee_id: z.string().uuid().optional(),
  resignation_id: z.string().uuid().optional().nullable(),
  letter_type: z.enum(['RELIEVING', 'EXPERIENCE']).optional(),
  issued_by: z.string().uuid().optional().nullable(),
  issued_at: z.string().datetime().optional().nullable(),
  letter_number: z.string().max(100).optional().nullable(),
  letter_url: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'ISSUED', 'CANCELLED']).optional(),
});

export const GET = enhanceRouteHandler(getExitLetterController);

export const PATCH = enhanceRouteHandler(updateExitLetterController, {
  schema: ExitLetterUpdateSchema,
});

export const DELETE = enhanceRouteHandler(deleteExitLetterController);
