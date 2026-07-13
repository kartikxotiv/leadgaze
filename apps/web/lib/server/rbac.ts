import 'server-only';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { ApiError } from '~/utils/response-handler';

type PermissionAccessLevel = 'none' | 'own' | 'team' | 'all';

type PermissionJoin = {
  access_level: PermissionAccessLevel | null;
  can_access: boolean | null;
  crm_module_features: {
    feature_key: string | null;
    crm_modules: {
      module_key: string | null;
    } | null;
  } | null;
};

const accessRank: Record<PermissionAccessLevel, number> = {
  none: 0,
  own: 1,
  team: 2,
  all: 3,
};

export async function getRbacSnapshot(params: {
  accountId: string;
  organizationId: string;
}) {
  const supabase = getSupabaseServerClient();

  const { data: members, error: memberError } = await supabase
    .from('workspace_members')
    .select('role_id, product_key, workspace_roles(role_key)')
    .eq('workspace_id', params.organizationId)
    .eq('user_id', params.accountId)
    .eq('status', 'accepted');

  if (memberError) {
    throw memberError;
  }

  if (!members || members.length === 0) {
    return {
      organizationId: params.organizationId,
      employeeId: null,
      roleKeys: [],
      allowedModules: [],
      permissions: [],
    };
  }

  const member = members.find((m: any) => m.product_key === null)
    || members.find((m: any) => m.product_key === 'sales')
    || members[0];

  const { data: permissions, error: permissionsError } = await supabase
    .from('role_permissions')
    .select(
      `
        can_access,
        access_level,
        crm_module_features!module_feature_id(
          feature_key,
          crm_modules!module_id(module_key)
        )
      `,
    )
    .eq('workspace_id', params.organizationId)
    .eq('role_id', member.role_id);

  if (permissionsError) {
    throw permissionsError;
  }

  const normalizedPermissions = (
    (permissions ?? []) as Array<PermissionJoin>
  ).map((permission) => {
    const moduleKey =
      permission.crm_module_features?.crm_modules?.module_key ?? '';

    return {
      module_key: moduleKey,
      feature_key: permission.crm_module_features?.feature_key ?? '',
      can_access: Boolean(permission.can_access),
      access_level: permission.access_level ?? 'none',
    };
  });

  const allowedModules = Array.from(
    new Set(
      normalizedPermissions
        .filter((permission) => permission.can_access)
        .flatMap((permission) => [
          permission.module_key,
          permission.module_key.startsWith('hrms_')
            ? permission.module_key.replace(/^hrms_/, '')
            : permission.module_key,
        ])
        .filter(Boolean),
    ),
  );

  const role = member.workspace_roles as { role_key?: string } | null;

  return {
    organizationId: params.organizationId,
    employeeId: null,
    roleKeys: role?.role_key ? [role.role_key] : [],
    allowedModules,
    permissions: normalizedPermissions,
  };
}

export async function requirePermission(params: {
  accountId: string;
  organizationId: string;
  moduleKey: string;
  featureKey: string;
  minAccessLevel?: PermissionAccessLevel;
}) {
  const snapshot = await getRbacSnapshot(params);
  const moduleKeys = [
    params.moduleKey,
    params.moduleKey.startsWith('hrms_')
      ? params.moduleKey.replace(/^hrms_/, '')
      : `hrms_${params.moduleKey}`,
  ];

  const permission = snapshot.permissions.find(
    (item) =>
      moduleKeys.includes(item.module_key) &&
      item.feature_key === params.featureKey &&
      item.can_access,
  );

  if (!permission) {
    throw new ApiError('Forbidden', 403);
  }

  const minAccessLevel = params.minAccessLevel ?? 'own';

  if (accessRank[permission.access_level] < accessRank[minAccessLevel]) {
    throw new ApiError('Forbidden', 403);
  }

  return {
    snapshot,
    permission: {
      ...permission,
      accessLevel: permission.access_level,
    },
  };
}

export async function getWorkspaceMember(
  supabase: any,
  workspaceId: string,
  userId: string,
  productKey?: string | null,
) {
  const { data: members, error } = await supabase
    .from('workspace_members')
    .select('id, workspace_id, user_id, role_id, status, product_key')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('status', 'accepted');

  if (error || !members || members.length === 0) {
    return { data: null, error: error || new Error('Member not found') };
  }

  // Find membership matching the active product or fallback
  const member = members.find((m: any) => m.product_key === productKey)
    || members.find((m: any) => m.product_key === null)
    || members[0];

  return { data: member, error: null };
}
