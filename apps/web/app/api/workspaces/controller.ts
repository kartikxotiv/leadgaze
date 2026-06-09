import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
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
      },
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

    // Create 7-day trial seats for all modules (owner gets access to everything)
    await createTrialSeats(workspace.id, userId);

    return successDataResponse(workspace, 'Workspace created successfully');
  },
);

// ─── Helper: Auto-create 7-day trial seats for all modules ──────

async function createTrialSeats(workspaceId: string, ownerUserId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminClient = getSupabaseServerAdminClient() as any;

  const now = new Date();
  const trialEnd = new Date(now.getTime());
  trialEnd.setDate(trialEnd.getDate() + 7);

  // Get all active subscription products
  const { data: products } = await adminClient
    .from('subscription_products')
    .select('id, product_key, display_name')
    .eq('is_active', true);

  if (!products || products.length === 0) {
    console.warn(
      'No active subscription products found — skipping trial seats.',
    );
    return;
  }

  // Create workspace_module_seats + seat_assignment for each product
  const seatRows = products.map((product) => ({
    workspace_id: workspaceId,
    product_id: product.id,
    seats_purchased: 1,
    seats_used: 0, // sync_seats_used trigger will set to 1 when assignment is created
    status: 'trialing' as const,
    billing_cycle: 'monthly' as const,
    current_period_start: now.toISOString(),
    current_period_end: trialEnd.toISOString(),
    trial_ends_at: trialEnd.toISOString(),
    payment_provider: 'manual' as const,
    provider_customer_id: `trial_cus_${workspaceId}`,
    provider_subscription_id: `trial_sub_${workspaceId}_${product.product_key}`,
    provider_metadata: { trial: true, source: 'workspace-creation' },
    created_by: ownerUserId,
    updated_by: ownerUserId,
  }));

  const { data: createdSeats, error: seatsError } = await adminClient
    .from('workspace_module_seats')
    .insert(seatRows)
    .select('id, product_id');

  if (seatsError || !createdSeats) {
    console.error('Failed to create trial seats:', seatsError);
    return;
  }

  // Create seat_assignment for the owner on each product
  const assignmentRows = createdSeats.map((seat) => ({
    seat_id: seat.id,
    workspace_id: workspaceId,
    user_id: ownerUserId,
    product_id: seat.product_id,
    is_active: true,
    assigned_by: ownerUserId,
  }));

  const { error: assignError } = await adminClient
    .from('seat_assignments')
    .insert(assignmentRows);

  if (assignError) {
    console.error('Failed to create trial seat assignments:', assignError);
  }
}

export { createNewWorkspace };
