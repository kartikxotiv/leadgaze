import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import { createOrganizationController } from './controller';

const OrganizationCreateSchema = z.object({
  name: z.string().min(2).max(200),
  display_name: z.string().min(2).max(200).optional().nullable(),
  contact_email: z.string().email().optional().nullable(),
  contact_phone: z.string().min(5).max(30).optional().nullable(),
  address: z.any().optional().nullable(),
  cin: z.string().min(5).max(50).optional().nullable(),
  gstin: z.string().min(5).max(50).optional().nullable(),
  pan_number: z.string().min(5).max(50).optional().nullable(),
  tan_number: z.string().min(5).max(50).optional().nullable(),
  logo_url: z.string().url().optional().nullable(),
  plan: z.string().min(2).max(50).optional().nullable(),
  fiscal_year_start: z.number().int().optional(),
});

export const POST = enhanceRouteHandler(createOrganizationController, {
  schema: OrganizationCreateSchema,
  auth: false,
});
