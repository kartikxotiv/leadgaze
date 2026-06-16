import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import { updateSupportSystemRequestController } from '../controller';

const SupportSystemRequestUpdateSchema = z.object({
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  response_message: z.string().max(2000).optional().nullable(),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
});

export const PATCH = enhanceRouteHandler(updateSupportSystemRequestController, {
  schema: SupportSystemRequestUpdateSchema,
});
