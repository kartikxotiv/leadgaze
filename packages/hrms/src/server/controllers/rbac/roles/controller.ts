/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { Database } from '~/lib/database.types';
import { getCurrentUserOrganizationId } from '~/lib/server/organizations';
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

/**
 * List all roles for the current organization.
 */
export const getRolesController = catchAsync(async ({ user }) => {
  const organizationId = await getCurrentUserOrganizationId(user?.id);
  if (!organizationId) throw new ApiError('Organization not found', 404);

  const supabase = getSupabaseServerClient<Database>();
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('organization_id', organizationId)
    .order('hierarchy_level', { ascending: false });

  if (error) throw new ApiError(error.message, 400);

  return successDataResponse('Roles fetched successfully', data);
});

/**
 * Create a new custom role.
 */
export const createRoleController = catchAsync(async ({ user, body }: any) => {
  const organizationId = await getCurrentUserOrganizationId(user?.id);
  if (!organizationId) throw new ApiError('Organization not found', 404);

  const supabaseAdmin = getSupabaseServerAdminClient<Database>();

  // Custom roles shouldn't clash with system roles or existing keys
  const roleKey = body.name.toLowerCase().replace(/\s+/g, '_');

  const { data, error } = await supabaseAdmin
    .from('roles')
    .insert({
      organization_id: organizationId,
      role_name: body.name,
      role_key: roleKey,
      description: body.description,
      color: body.color,
      is_system: false,
      hierarchy_level: body.hierarchy_level || 1,
      created_by: user!.id,
    })
    .select()
    .single();

  if (error) throw new ApiError(error.message, 400);

  return successDataResponse('Role created successfully', data);
});

/**
 * Update role details.
 */
export const updateRoleController = catchAsync(
  async ({ user, params, body }: any) => {
    const organizationId = await getCurrentUserOrganizationId(user?.id);
    if (!organizationId) throw new ApiError('Organization not found', 404);

    const supabase = getSupabaseServerClient<Database>();
    const supabaseAdmin = getSupabaseServerAdminClient<Database>();

    // Check if role is system
    const { data: existingRole, error: fetchError } = await supabase
      .from('roles')
      .select('is_system')
      .eq('id', params.id)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !existingRole) throw new ApiError('Role not found', 404);
    if (existingRole.is_system)
      throw new ApiError('System roles cannot be renamed', 400);

    const { data, error } = await supabaseAdmin
      .from('roles')
      .update({
        role_name: body.name,
        description: body.description,
        color: body.color,
        hierarchy_level: body.hierarchy_level,
      })
      .eq('id', params.id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw new ApiError(error.message, 400);

    return successDataResponse('Role updated successfully', data);
  },
);

/**
 * Delete a custom role.
 */
export const deleteRoleController = catchAsync(
  async ({ user, params }: any) => {
    const organizationId = await getCurrentUserOrganizationId(user?.id);
    if (!organizationId) throw new ApiError('Organization not found', 404);

    const supabase = getSupabaseServerClient<Database>();
    const supabaseAdmin = getSupabaseServerAdminClient<Database>();

    // Ensure it's not a system role
    const { data: role, error: fetchError } = await supabase
      .from('roles')
      .select('is_system')
      .eq('id', params.id)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !role) throw new ApiError('Role not found', 404);
    if (role.is_system)
      throw new ApiError('System roles cannot be deleted', 400);

    const { error } = await supabaseAdmin
      .from('roles')
      .delete()
      .eq('id', params.id)
      .eq('organization_id', organizationId);

    if (error) throw new ApiError(error.message, 400);

    return successDataResponse('Role deleted successfully');
  },
);

/**
 * Get all permissions for a specific role, including all possible module-features.
 */
export const getRolePermissionsController = catchAsync(
  async ({ user, params }: any) => {
    const organizationId = await getCurrentUserOrganizationId(user?.id);
    if (!organizationId) throw new ApiError('Organization not found', 404);

    const supabase = getSupabaseServerClient<Database>();

    // 1. Fetch all modules and their features
    const { data: modules, error: modulesError } = await supabase
      .from('modules')
      .select('*, features:module_features(*)')
      .eq('is_active', true)
      .order('display_order');

    if (modulesError) throw new ApiError(modulesError.message, 400);

    // 2. Fetch existing permissions for this role
    const { data: permissions, error: permissionsError } = await supabase
      .from('role_permissions')
      .select('*')
      .eq('role_id', params.id)
      .eq('organization_id', organizationId);

    if (permissionsError) throw new ApiError(permissionsError.message, 400);

    return successDataResponse('Role permissions fetched successfully', {
      modules,
      permissions,
    });
  },
);

/**
 * Bulk update permissions for a role.
 */
export const updateRolePermissionsController = catchAsync(
  async ({ user, params, body }: any) => {
    const organizationId = await getCurrentUserOrganizationId(user?.id);
    if (!organizationId) throw new ApiError('Organization not found', 404);

    const supabaseAdmin = getSupabaseServerAdminClient<Database>();
    const roleId = params.id;

    // Body should be an array of permissions
    const permissions = (body.permissions || []) as Array<{
      module_feature_id: string;
      can_access: boolean;
      access_level: Database['public']['Enums']['permission_access_level'];
      can_view_sensitive_data: boolean;
      can_override_owner: boolean;
    }>;

    if (permissions.length === 0) {
      return successDataResponse('No permissions to update');
    }

    const upsertData = permissions.map((p) => ({
      organization_id: organizationId,
      role_id: roleId,
      module_feature_id: p.module_feature_id,
      can_access: p.can_access,
      access_level: p.access_level,
      can_view_sensitive_data: p.can_view_sensitive_data,
      can_override_owner: p.can_override_owner,
      updated_at: new Date().toISOString(),
      updated_by: user!.id,
    }));

    const { error } = await supabaseAdmin
      .from('role_permissions')
      .upsert(upsertData, { onConflict: 'role_id, module_feature_id' });

    if (error) throw new ApiError(error.message, 400);

    return successDataResponse('Permissions updated successfully');
  },
);
