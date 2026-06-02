import { ApiError } from '../../utils/response-handler';

type RoleMemberRow = {
  role_id?: string | { id?: string } | null;
};

type PermissionRow = {
  can_access?: boolean | null;
};

type InventoryPermissionSupabaseClient = {
  from: (table: string) => {
    select: (query: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          eq: (column: string, value: string) => {
            maybeSingle: () => Promise<{
              data: RoleMemberRow | PermissionRow | null;
              error: Error | null;
            }>;
          };
        };
      };
    };
  };
};

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
  const memberResult = await supabase
    .from('workspace_members')
    .select('role_id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('status', 'accepted')
    .maybeSingle();

  const member = memberResult.data as RoleMemberRow | null;

  if (memberResult.error || !member?.role_id) {
    throw new ApiError('You do not have permission to access this feature', 403);
  }

  const roleId =
    typeof member.role_id === 'object' ? member.role_id?.id : member.role_id;

  const permissionResult = await supabase
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

  const permission = permissionResult.data as PermissionRow | null;

  if (permissionResult.error || !permission?.can_access) {
    throw new ApiError('You do not have permission to access this feature', 403);
  }
}
