import { NextRequest } from 'next/server';
import { z } from 'zod';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { catchAsync, successDataResponse } from '~/utils/response-handler';

export const getRolePermissions = catchAsync(async ({ params }: { request: NextRequest; params: { id: string } }) => {
  const adminClient = getSupabaseServerAdminClient();

  const { data: rolePermissions, error } = await adminClient
    .schema('admin')
    .from('role_permissions')
    .select('*')
    .eq('role_id', params.id);

  if (error) throw error;

  return successDataResponse({
    data: rolePermissions || [],
  });
});

const permissionSchema = z.object({
  permission_id: z.string().uuid(),
  can_view: z.boolean().default(false),
  can_create: z.boolean().default(false),
  can_edit: z.boolean().default(false),
  can_delete: z.boolean().default(false),
});

const updateRolePermissionsSchema = z.object({
  permissions: z.array(permissionSchema),
});

export const updateRolePermissions = catchAsync(async ({ request, params }: { request: NextRequest; params: { id: string } }) => {
  const adminClient = getSupabaseServerAdminClient();
  const body = await request.json();
  const parsed = updateRolePermissionsSchema.parse(body);

  // For a bulk update, it's easiest to delete existing and re-insert, 
  // or upsert. Supabase supports upsert.
  
  const upsertData = parsed.permissions.map(p => ({
    role_id: params.id,
    permission_id: p.permission_id,
    can_view: p.can_view,
    can_create: p.can_create,
    can_edit: p.can_edit,
    can_delete: p.can_delete,
  }));

  // Upsert the new permissions
  const { error: upsertError } = await adminClient
    .schema('admin')
    .from('role_permissions')
    .upsert(upsertData, { onConflict: 'role_id, permission_id' });

  if (upsertError) throw upsertError;
  
  // Optionally delete permissions that were not included in the payload
  if (upsertData.length > 0) {
    const includedPermissionIds = upsertData.map(d => d.permission_id);
    await adminClient
      .schema('admin')
      .from('role_permissions')
      .delete()
      .eq('role_id', params.id)
      .not('permission_id', 'in', `(${includedPermissionIds.join(',')})`);
  } else {
      // If array is empty, delete all
      await adminClient
      .schema('admin')
      .from('role_permissions')
      .delete()
      .eq('role_id', params.id);
  }

  return successDataResponse({ data: { message: 'Permissions updated successfully' } });
});
