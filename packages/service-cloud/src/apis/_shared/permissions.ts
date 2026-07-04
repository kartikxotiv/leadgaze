'use server';

export async function hasServiceCloudFeaturePermission(
  supabase: any,
  workspaceId: string,
  userId: string,
  moduleKey: string,
  featureKey: string,
) {
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('owner_id')
    .eq('id', workspaceId)
    .maybeSingle();

  if (workspace?.owner_id === userId) {
    return true;
  }

  const { data: members } = await supabase
    .from('workspace_members')
    .select('role_id, product_key')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('status', 'accepted');

  const member = members?.find((m: any) => m.product_key === 'service_cloud')
    || members?.find((m: any) => m.product_key === null)
    || members?.[0];

  if (!member?.role_id) {
    return false;
  }

  const { data: permission } = await supabase
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
    .eq('role_id', member.role_id)
    .eq('crm_module_features.feature_key', featureKey)
    .eq('crm_module_features.crm_modules.module_key', moduleKey)
    .maybeSingle();

  return Boolean(permission?.can_access);
}

export async function hasServiceCloudManageInboxPermission(
  supabase: any,
  workspaceId: string,
  userId: string,
) {
  return hasServiceCloudFeaturePermission(
    supabase,
    workspaceId,
    userId,
    'emails',
    'manage_inbox',
  );
}
