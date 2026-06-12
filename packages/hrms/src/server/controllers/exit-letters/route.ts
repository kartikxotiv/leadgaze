import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import {
  createExitLetterController,
  listExitLettersController,
} from './controller';

const ExitLetterCreateSchema = z.object({
  employee_id: z.string().uuid(),
  resignation_id: z.string().uuid().optional().nullable(),
  letter_type: z.enum(['RELIEVING', 'EXPERIENCE']),
  issued_by: z.string().uuid().optional().nullable(),
  issued_at: z.string().datetime().optional().nullable(),
  letter_number: z.string().max(100).optional().nullable(),
  letter_url: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'ISSUED', 'CANCELLED']).optional(),
});

export const GET = enhanceRouteHandler(listExitLettersController);

export const POST = enhanceRouteHandler(createExitLetterController, {
  schema: ExitLetterCreateSchema,
});
