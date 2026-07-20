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
    const productKey = url.searchParams.get('productKey');
    const sortColumn = url.searchParams.get('sortColumn') || 'hierarchy_level';
    const sortDirection = url.searchParams.get('sortDirection') || 'desc';
    const type = url.searchParams.get('type');
    const status = url.searchParams.get('status');
    const searchTerm = url.searchParams.get('searchTerm');

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
        { status: 400 },
      );
    }

    let query = supabase
      .from('workspace_roles')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (productKey) {
      query = query.eq('product_key', productKey);
    }

    if (type === 'system') {
      query = query.eq('is_system', true);
    } else if (type === 'custom') {
      query = query.eq('is_system', false);
    }

    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    if (searchTerm) {
      query = query.or(`role_name.ilike.%${searchTerm}%,role_key.ilike.%${searchTerm}%`);
    }

    if (sortColumn) {
      query = query.order(sortColumn, { ascending: sortDirection === 'asc' });
      if (sortColumn !== 'role_name') {
        query = query.order('role_name', { ascending: true });
      }
    } else {
      query = query
        .order('hierarchy_level', { ascending: false })
        .order('role_name', { ascending: true });
    }

    const { data: roles, error } = await query;

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
      color,
      permissions,
      product_key,
    } = await request.json();

    if (!workspaceId || !role_key || !role_name) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 },
      );
    }

    // Check if role_key already exists for this product in this workspace
    const roleProductKey = product_key || 'sales';
    const { data: existingRole, error: checkError } = await supabase
      .from('workspace_roles')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('product_key', roleProductKey)
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

    const { data: createdRole, error: createRoleError } = await supabase
      .from('workspace_roles')
      .insert({
        workspace_id: workspaceId,
        role_key,
        role_name,
        description,
        hierarchy_level: 0,
        color,
        is_system: false,
        is_active: true,
        product_key: roleProductKey,
      })
      .select()
      .single();

    if (createRoleError) {
      console.error('Create role error:', createRoleError);
      throw createRoleError;
    }

    // Insert permissions if provided
    if (permissions && permissions.length > 0) {
      const permissionRecords = permissions.map((perm: any) => ({
        workspace_id: workspaceId,
        role_id: createdRole.id,
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
      data: createdRole,
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
    const supabase = getSupabaseServerClient() as any;
    const url = new URL(request.url);
    const productKey = url.searchParams.get('productKey');

    // Get modules filtered by product_key directly on crm_modules table.
    // Include 'common' modules plus the shared emails module for service roles,
    // where it exposes only emails:manage_inbox.
    let modulesQuery = supabase
      .from('crm_modules')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (productKey) {
      // Get both product-specific AND common modules
      modulesQuery = modulesQuery.in('product_key', [productKey, 'common']);
    }

    let { data: modules, error: modulesError } = await modulesQuery;
    if (modulesError) throw modulesError;

    if (productKey === 'service_cloud') {
      const { data: emailModule, error: emailModuleError } = await supabase
        .from('crm_modules')
        .select('*')
        .eq('module_key', 'emails')
        .eq('is_active', true)
        .maybeSingle();

      if (emailModuleError) throw emailModuleError;

      if (
        emailModule &&
        !(modules ?? []).some((module: any) => module.id === emailModule.id)
      ) {
        modules = [...(modules ?? []), emailModule].sort(
          (a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0),
        );
      }
    }

    const moduleList = modules ?? [];

    // Get features for these modules
    const moduleIds = moduleList.map((m: any) => m.id);
    let features: any[] = [];

    if (moduleIds.length > 0) {
      const { data: featureData, error: featuresError } = await supabase
        .from('crm_module_features')
        .select('*')
        .in('module_id', moduleIds)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (featuresError) throw featuresError;
      features = featureData ?? [];
    }

    const moduleById = new Map<string, any>(
      moduleList.map((module: any) => [module.id, module]),
    );

    features = features.filter((feature: any) => {
      const module = moduleById.get(feature.module_id);

      if (module?.module_key !== 'emails' || !productKey) {
        return true;
      }

      if (productKey === 'service_cloud') {
        return feature.feature_key === 'manage_inbox';
      }

      if (productKey === 'sales') {
        return feature.feature_key === 'manage_email';
      }

      return false;
    });

    // Group features by module
    const modulesWithFeatures = moduleList
      .map((module: any) => ({
        ...module,
        features: features.filter((f: any) => f.module_id === module.id),
      }))
      .filter(
        (module: any) =>
          module.module_key !== 'emails' || module.features.length > 0,
      );

    return successDataResponse(
      'Modules with features retrieved successfully',
      modulesWithFeatures,
    );
  },
);

export { getAllRoles, createRole, getModulesWithFeatures };
