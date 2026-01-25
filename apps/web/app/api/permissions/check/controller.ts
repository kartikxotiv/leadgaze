import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { catchAsync, successDataResponse } from '~/utils/response-handler';

const checkPermission = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId');
    const moduleKey = url.searchParams.get('moduleKey');
    const featureKey = url.searchParams.get('featureKey');

    if (!workspaceId || !moduleKey || !featureKey) {
      return NextResponse.json(
        {
          message:
            'Missing required parameters: workspaceId, moduleKey, featureKey',
        },
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

    // Get user's role in workspace
    const { data: member, error: memberError } = await supabase
      .from('workspace_members')
      .select('role_id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return successDataResponse({ canAccess: false });
    }

    // Get the feature
    const { data: module, error: moduleError } = await supabase
      .from('crm_modules')
      .select('id')
      .eq('module_key', moduleKey)
      .single();

    if (moduleError || !module) {
      return successDataResponse({ canAccess: false });
    }

    const { data: feature, error: featureError } = await supabase
      .from('crm_module_features')
      .select('id')
      .eq('module_id', module.id)
      .eq('feature_key', featureKey)
      .single();

    if (featureError || !feature) {
      return successDataResponse({ canAccess: false });
    }

    // Check permission
    const { data: permission, error: permError } = await supabase
      .from('role_permissions')
      .select('can_access')
      .eq('role_id', member.role_id)
      .eq('module_feature_id', feature.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (permError || !permission) {
      return successDataResponse({ canAccess: false });
    }

    return successDataResponse({ canAccess: permission.can_access });
  },
);

export { checkPermission };
