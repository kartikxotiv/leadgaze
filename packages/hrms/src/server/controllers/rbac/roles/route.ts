import { z } from 'zod';
import { enhanceRouteHandler } from '@kit/next/routes';
import { createRoleController, getRolesController } from './controller';

const CreateRoleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
  hierarchy_level: z.number().int().min(1).max(10).optional(),
});

export const GET = enhanceRouteHandler(getRolesController);

export const POST = enhanceRouteHandler(createRoleController, {
  schema: CreateRoleSchema,
});
