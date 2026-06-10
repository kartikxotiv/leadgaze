import { z } from 'zod';
import { enhanceRouteHandler } from '@kit/next/routes';
import { getRolePermissionsController, updateRolePermissionsController } from '../../controller';

const UpdateRolePermissionsSchema = z.object({
  permissions: z.array(z.object({
    module_feature_id: z.string().uuid(),
    can_access: z.boolean(),
    access_level: z.enum(['none', 'own', 'team', 'all']),
    can_view_sensitive_data: z.boolean(),
    can_override_owner: z.boolean(),
  }))
});

export const GET = enhanceRouteHandler(getRolePermissionsController);

export const POST = enhanceRouteHandler(updateRolePermissionsController, {
  schema: UpdateRolePermissionsSchema,
});
