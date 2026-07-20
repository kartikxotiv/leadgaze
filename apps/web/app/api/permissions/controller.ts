import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { catchAsync, successDataResponse } from '~/utils/response-handler';

const getPermissions = catchAsync(
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
        { message: 'Missing workspaceId parameter' },
        { status: 400 },
      );
    }

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Get user's role in the workspace
    const { data: members, error: memberError } = await supabase
      .from('workspace_members')
      .select(
        `
        role_id,
        workspace_roles (*)
      `,
      )
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id);

    if (memberError || !members || members.length === 0) {
      return NextResponse.json(
        { message: 'User is not a member of this workspace' },
        { status: 403 },
      );
    }

    // Find the primary global membership (where product_key is null) if it exists,
    // or fallback to sales, or the first available membership.
    const memberData = members.find((m: any) => m.workspace_roles?.product_key === null) 
      || members.find((m: any) => m.workspace_roles?.product_key === 'sales')
      || members[0];

    const role = memberData.workspace_roles;
    const roleId = memberData.role_id;

    // Get all permissions for this role
    const { data: permissions, error: permError } = await supabase
      .from('role_permissions')
      .select('*')
      .eq('role_id', roleId)
      .eq('workspace_id', workspaceId);

    if (permError) {
      return NextResponse.json(
        { message: 'Failed to fetch permissions' },
        { status: 500 },
      );
    }

    // Get all modules
    const { data: modules, error: modulesError } = await supabase
      .from('crm_modules')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (modulesError) {
      return NextResponse.json(
        { message: 'Failed to fetch modules' },
        { status: 500 },
      );
    }

    // Get all features
    const { data: features, error: featuresError } = await supabase
      .from('crm_module_features')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (featuresError) {
      return NextResponse.json(
        { message: 'Failed to fetch features' },
        { status: 500 },
      );
    }

    return successDataResponse({
      role,
      permissions: permissions || [],
      modules: modules || [],
      features: features || [],
    });
  },
);

export { getPermissions };
