import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';

const getAllRoles = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
        { status: 400 },
      );
    }

    const { data: roles, error } = await supabase
      .from('workspace_roles')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('hierarchy_level', { ascending: false });

    if (error) {
      console.error('Get roles error:', error);
      throw error;
    }

    return successDataResponse('Roles retrieved successfully', roles);
  },
);

const createRole = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const {
      workspaceId,
      role_key,
      role_name,
      description,
      hierarchy_level,
      color,
      permissions,
    } = await request.json();

    if (
      !workspaceId ||
      !role_key ||
      !role_name ||
      hierarchy_level === undefined
    ) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 },
      );
    }

    // Check if role_key already exists in this workspace
    const { data: existingRole, error: checkError } = await supabase
      .from('workspace_roles')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('role_key', role_key)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Check role error:', checkError);
      throw checkError;
    }

    if (existingRole) {
      return NextResponse.json(
        { message: 'Role key already exists in this workspace' },
        { status: 409 },
      );
    }

    const { data: role, error } = await supabase
      .from('workspace_roles')
      .insert({
        workspace_id: workspaceId,
        role_key,
        role_name,
        description,
        hierarchy_level,
        color,
        is_system: false,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Create role error:', error);
      throw error;
    }

    // Insert permissions if provided
    if (permissions && permissions.length > 0) {
      const permissionRecords = permissions.map((perm: any) => ({
        workspace_id: workspaceId,
        role_id: role.id,
        module_feature_id: perm.module_feature_id,
        can_access: perm.can_access,
        access_level: perm.access_level || 'none',
      }));

      const { error: permError } = await supabase
        .from('role_permissions')
        .insert(permissionRecords);

      if (permError) {
        console.error('Create permissions error:', permError);
        throw permError;
      }
    }

    return successDataResponse({
      data: role,
      message: 'Role created successfully',
      statusCode: 201,
    });
  },
);

const getModulesWithFeatures = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();

    // Get all modules
    const { data: modules, error: modulesError } = await supabase
      .from('crm_modules')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (modulesError) {
      console.error('Get modules error:', modulesError);
      throw modulesError;
    }

    // Get all features grouped by module
    const { data: features, error: featuresError } = await supabase
      .from('crm_module_features')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (featuresError) {
      console.error('Get features error:', featuresError);
      throw featuresError;
    }

    // Group features by module
    const modulesWithFeatures =
      modules?.map((module: any) => ({
        ...module,
        features: features?.filter((f: any) => f.module_id === module.id) || [],
      })) || [];

    return successDataResponse(
      'Modules with features retrieved successfully',
      modulesWithFeatures,
    );
  },
);

export { getAllRoles, createRole, getModulesWithFeatures };
