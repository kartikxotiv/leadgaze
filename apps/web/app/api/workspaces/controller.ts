import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';

const createNewWorkspace = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const { name, owner_id } = await request.json();

    // Validate input
    if (!name || !owner_id) {
      return NextResponse.json(
        { message: 'Name and owner_id are required' },
        { status: 400 },
      );
    }

    // Create slug from name
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
      .slice(0, 50);

    // Get the user ID from the Authorization header or request context
    // For now, we'll use owner_id as a proxy since it's passed from the client
    const userId = owner_id;

    // Create workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({
        name,
        slug: `${slug}-${Date.now().toString(36)}`,
        owner_id,
        is_active: true,
        created_by: userId,
      })
      .select()
      .single();

    if (workspaceError || !workspace) {
      console.error('Workspace creation error:', workspaceError);
      return NextResponse.json(
        { message: 'Failed to create workspace' },
        { status: 500 },
      );
    }

    // Get default roles from workspace_roles table (should be created during workspace creation in app logic)
    // For now, we'll create basic roles
    const roles = [
      {
        role_key: 'admin',
        role_name: 'Admin',
        hierarchy_level: 100,
        is_system: true,
      }
      // {
      //   role_key: 'manager',
      //   role_name: 'Manager',
      //   hierarchy_level: 50,
      //   is_system: true,
      // },
      // {
      //   role_key: 'user',
      //   role_name: 'User',
      //   hierarchy_level: 10,
      //   is_system: true,
      // },
      // {
      //   role_key: 'viewer',
      //   role_name: 'Viewer',
      //   hierarchy_level: 1,
      //   is_system: true,
      // },
    ];

    const { data: rolesData, error: rolesError }: any = await supabase
      .from('workspace_roles')
      .insert(
        roles.map((role) => ({
          workspace_id: workspace.id,
          ...role,
          is_active: true,
        })),
      )
      .select();

    if (rolesError) {
      console.error('Roles creation error:', rolesError);
    }

    // Add owner as admin member
    const adminRole = rolesData?.[0]; // Admin is first
    if (adminRole) {
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: userId,
          role_id: adminRole.id,
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          is_primary_contact: true,
        });

      if (memberError) {
        console.error('Member creation error:', memberError);
      }
    }

    // Create default permissions for all roles
    // Get all features
    const { data: features, error: featuresError } = await supabase
      .from('crm_module_features')
      .select('id');

    if (!featuresError && features && rolesData) {
      // Create permissions for each role
      const permissions: any = [];

      // Admin: Full access to all features
      for (const feature of features) {
        permissions.push({
          workspace_id: workspace.id,
          role_id: rolesData[0].id, // Admin
          module_feature_id: feature.id,
          can_access: true,
          access_level: 'all',
          can_view_sensitive_data: true,
          can_override_owner: true,
        });
      }

      if (permissions.length > 0) {
        const { error: permError } = await supabase
          .from('role_permissions')
          .insert(permissions);

        if (permError) {
          console.error('Permissions creation error:', permError);
        }
      }
    }

    return successDataResponse(workspace, 'Workspace created successfully');
  },
);

export { createNewWorkspace };
