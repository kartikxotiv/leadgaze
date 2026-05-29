import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import { updateSelfServiceProfileController } from '../controller';

const SelfServiceProfileSchema = z.object({
  address: z.string().max(500).optional().nullable(),
  emergency_contact_name: z.string().max(150).optional().nullable(),
  emergency_contact_phone: z.string().max(20).optional().nullable(),
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().max(100).optional().nullable(),
  personal_email: z.string().email().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
});

export const PATCH = enhanceRouteHandler(updateSelfServiceProfileController, {
  schema: SelfServiceProfileSchema,
});
