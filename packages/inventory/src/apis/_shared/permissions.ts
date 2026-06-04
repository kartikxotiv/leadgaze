import { ApiError } from '../../utils/response-handler';

export async function assertInventoryPermission({
  supabase,
  userId,
  workspaceId,
  moduleKey,
  featureKey,
}: {
  supabase: any;
  userId: string;
  workspaceId: string;
  moduleKey: string;
  featureKey: string;
}) {
  const { data: member, error: memberError } = await supabase
    .from('workspace_members')
    .select('role_id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('status', 'accepted')
    .maybeSingle();

  if (memberError || !member?.role_id) {
    throw new ApiError('You do not have permission to access this feature', 403);
  }

  const roleId =
    typeof member.role_id === 'object' ? member.role_id?.id : member.role_id;

  const { data: permissions, error: permissionsError } = await supabase
    .from('role_permissions')
    .select(
      `
      can_access,
      crm_module_features!module_feature_id (
        feature_key,
        crm_modules!module_id (
          module_key
        )
      )
    `,
    )
    .eq('role_id', roleId);

  if (permissionsError) {
    throw new ApiError('You do not have permission to access this feature', 403);
  }

  const inventoryPermissions = (permissions ?? []).filter(
    (permission: any) =>
      permission.crm_module_features?.crm_modules?.module_key?.startsWith('inventory'),
  );

  if (inventoryPermissions.length === 0) {
    return;
  }

  const hasPermission = inventoryPermissions.some(
    (permission: any) =>
      permission.crm_module_features?.crm_modules?.module_key === moduleKey &&
      permission.crm_module_features?.feature_key === featureKey &&
      Boolean(permission.can_access),
  );

  if (!hasPermission) {
    throw new ApiError('You do not have permission to access this feature', 403);
  }
}

