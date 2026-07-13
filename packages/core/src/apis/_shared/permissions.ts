const SALES_EMAIL_ENTITY_TYPES = new Set([
  'lead',
  'contact',
  'account',
  'opportunity',
]);

export function isSalesEmailEntityType(entityType?: string | null) {
  return SALES_EMAIL_ENTITY_TYPES.has(String(entityType ?? '').toLowerCase());
}

export async function hasCoreWorkspaceFeaturePermission(
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

  const member = members?.find((m: any) => m.product_key === 'sales')
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

export function hasSalesManageEmailPermission(
  supabase: any,
  workspaceId: string,
  userId: string,
) {
  return hasCoreWorkspaceFeaturePermission(
    supabase,
    workspaceId,
    userId,
    'emails',
    'manage_email',
  );
}
