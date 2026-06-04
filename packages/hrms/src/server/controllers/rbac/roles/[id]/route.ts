import { z } from 'zod';
import { enhanceRouteHandler } from '@kit/next/routes';
import { deleteRoleController, updateRoleController } from '../controller';

const UpdateRoleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  hierarchy_level: z.number().int().min(1).max(10).optional(),
});

export const PATCH = enhanceRouteHandler(updateRoleController, {
  schema: UpdateRoleSchema,
});

export const DELETE = enhanceRouteHandler(deleteRoleController);
