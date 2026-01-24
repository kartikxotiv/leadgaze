import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse,
} from '../../../../utils/response-handler';

const getRoleById = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const roleId = params?.roleId;

    if (!roleId) {
      return NextResponse.json(
        { message: 'roleId is required' },
        { status: 400 },
      );
    }

    const { data: role, error } = await supabase
      .from('workspace_roles')
      .select('*')
      .eq('id', roleId)
      .single();

    if (error) {
      console.error('Get role error:', error);
      throw error;
    }

    if (!role) {
      return NextResponse.json({ message: 'Role not found' }, { status: 404 });
    }

    return successDataResponse({
      data: role,
      message: 'Role retrieved successfully',
    });
  },
);

const updateRole = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const roleId = params?.roleId;
    const { role_name, description, hierarchy_level, color, is_active } =
      await request.json();

    if (!roleId) {
      return NextResponse.json(
        { message: 'roleId is required' },
        { status: 400 },
      );
    }

    // Get current role to check if it's system role
    const { data: currentRole, error: fetchError } = await supabase
      .from('workspace_roles')
      .select('*')
      .eq('id', roleId)
      .single();

    if (fetchError) {
      console.error('Fetch role error:', fetchError);
      throw fetchError;
    }

    if (!currentRole) {
      return NextResponse.json({ message: 'Role not found' }, { status: 404 });
    }

    // System roles can't be deactivated
    if (currentRole.is_system && is_active === false) {
      return NextResponse.json(
        { message: 'System roles cannot be deactivated' },
        { status: 403 },
      );
    }

    const updateData: any = {};
    if (role_name !== undefined) updateData.role_name = role_name;
    if (description !== undefined) updateData.description = description;
    if (hierarchy_level !== undefined)
      updateData.hierarchy_level = hierarchy_level;
    if (color !== undefined) updateData.color = color;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: updatedRole, error } = await supabase
      .from('workspace_roles')
      .update(updateData)
      .eq('id', roleId)
      .select()
      .single();

    if (error) {
      console.error('Update role error:', error);
      throw error;
    }

    return successDataResponse('Role updated successfully', updatedRole);
  },
);

const deleteRole = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const roleId = params?.roleId;

    if (!roleId) {
      return NextResponse.json(
        { message: 'roleId is required' },
        { status: 400 },
      );
    }

    // Get current role
    const { data: role, error: fetchError } = await supabase
      .from('workspace_roles')
      .select('*')
      .eq('id', roleId)
      .single();

    if (fetchError) {
      console.error('Fetch role error:', fetchError);
      throw fetchError;
    }

    if (!role) {
      return NextResponse.json({ message: 'Role not found' }, { status: 404 });
    }

    // System roles can't be deleted
    if (role.is_system) {
      return NextResponse.json(
        { message: 'System roles cannot be deleted' },
        { status: 403 },
      );
    }

    // Check if role has members
    const { data: members, error: memberError } = await supabase
      .from('workspace_members')
      .select('id', { count: 'exact', head: true })
      .eq('role_id', roleId);

    if (memberError) {
      console.error('Check members error:', memberError);
      throw memberError;
    }

    if (members && members.length > 0) {
      return NextResponse.json(
        {
          message:
            'Cannot delete role with active members. Please reassign members first.',
        },
        { status: 409 },
      );
    }

    const { error: deleteError } = await supabase
      .from('workspace_roles')
      .delete()
      .eq('id', roleId);

    if (deleteError) {
      console.error('Delete role error:', deleteError);
      throw deleteError;
    }

    return successDataResponse('Role deleted successfully');
  },
);

const getRolePermissions = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const roleId = params?.roleId;

    if (!roleId) {
      return NextResponse.json(
        { message: 'roleId is required' },
        { status: 400 },
      );
    }

    // Get permissions for this role with feature details
    const { data: permissions, error } = await supabase
      .from('role_permissions')
      .select(
        `
        id,
        can_access,
        access_level,
        module_feature_id,
        crm_module_features(id, feature_key, feature_name, module_id, feature_type)
      `,
      )
      .eq('role_id', roleId);

    if (error) {
      console.error('Get permissions error:', error);
      throw error;
    }

    return successDataResponse({
      data: permissions,
      message: 'Role permissions retrieved successfully',
    });
  },
);

const updateRolePermissions = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const roleId = params?.roleId;
    const { permissions } = await request.json();

    if (!roleId) {
      return NextResponse.json(
        { message: 'roleId is required' },
        { status: 400 },
      );
    }

    if (!permissions || !Array.isArray(permissions)) {
      return NextResponse.json(
        { message: 'Permissions must be an array' },
        { status: 400 },
      );
    }

    // Get the workspace_id from the role
    const { data: role, error: roleError } = await supabase
      .from('workspace_roles')
      .select('workspace_id')
      .eq('id', roleId)
      .single();

    if (roleError || !role) {
      return NextResponse.json({ message: 'Role not found' }, { status: 404 });
    }

    // Delete existing permissions
    const { error: deleteError } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId);

    if (deleteError) {
      console.error('Delete permissions error:', deleteError);
      throw deleteError;
    }

    // Insert new permissions
    if (permissions.length > 0) {
      const permissionRecords = permissions.map((perm: any) => ({
        workspace_id: role.workspace_id,
        role_id: roleId,
        module_feature_id: perm.module_feature_id,
        can_access: perm.can_access,
        access_level: perm.access_level || 'none',
      }));

      const { error: insertError } = await supabase
        .from('role_permissions')
        .insert(permissionRecords);

      if (insertError) {
        console.error('Insert permissions error:', insertError);
        throw insertError;
      }
    }

    return successDataResponse('Role permissions updated successfully', {
      role_id: roleId,
      permissions_count: permissions.length,
    });
  },
);

export {
  getRoleById,
  updateRole,
  deleteRole,
  getRolePermissions,
  updateRolePermissions,
};
