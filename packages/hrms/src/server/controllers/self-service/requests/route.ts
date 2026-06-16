import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import { createSelfServiceRequestController } from '../controller';

const SelfServiceRequestSchema = z.object({
  category: z.enum([
    'payroll',
    'policy',
    'personal_details',
    'documents',
    'benefits',
    'other',
  ]),
  description: z.string().min(10).max(2000),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  subject: z.string().min(3).max(150),
});

export const POST = enhanceRouteHandler(createSelfServiceRequestController, {
  schema: SelfServiceRequestSchema,
});
