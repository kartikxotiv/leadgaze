import { ApiError } from '../../utils/response-handler';

export async function assertFundraisingPermission({
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

  const { data: permission, error: permissionError } = await supabase
    .from('role_permissions')
    .select(
      `
      can_access,
      crm_module_features!inner (
        feature_key,
        crm_modules!inner (
          module_key
        )
      )
    `,
    )
    .eq('role_id', roleId)
    .eq('crm_module_features.feature_key', featureKey)
    .eq('crm_module_features.crm_modules.module_key', moduleKey)
    .maybeSingle();

  if (permissionError || !permission?.can_access) {
    throw new ApiError('You do not have permission to access this feature', 403);
  }
}
