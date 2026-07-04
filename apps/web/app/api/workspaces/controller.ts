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
    const supabase = getSupabaseServerClient() as any;
    const { 
      name, 
      owner_id,
      company_id,
      product_preferences,
      is_subscribed_for_updates,
      is_onboarding_finished,
    } = await request.json();

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
        company_id: company_id || null,
        product_preferences: product_preferences || {},
        is_subscribed_for_updates: is_subscribed_for_updates ?? true,
        is_onboarding_finished: is_onboarding_finished ?? false,
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

    // Get all active subscription products to seed admin roles for each
    const { data: activeProducts } = await supabase
      .from('subscription_products')
      .select('product_key')
      .eq('is_active', true);

    const productKeys = activeProducts?.map((p: any) => p.product_key) || [
      'sales',
    ];

    // Create admin role for each active product
    const roles: any[] = [];
    for (const productKey of productKeys) {
      roles.push({
        role_key: 'admin',
        role_name: 'Admin',
        hierarchy_level: 100,
        is_system: true,
        product_key: productKey,
      });
    }

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

    const salesAdminRole = rolesData?.find(
      (role: any) => role.product_key === 'sales' && role.role_key === 'admin',
    );

    if (rolesError) {
      console.error('Roles creation error:', rolesError);
    }

    if (!salesAdminRole) {
      console.warn('Sales admin role was not created or found. Owner cross-product permissions may be incomplete.');
    }

    // Add owner as primary global member (product_key = null) to serve as a fallback.
    if (salesAdminRole) {
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: userId,
          role_id: salesAdminRole.id,
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          is_primary_contact: true,
          product_key: null,
          product_id: null,
        });

      if (memberError) {
        console.error('Member creation error:', memberError);
      }
    }

    // Create default permissions for the workspace owner.
    //
    // Architecture note: workspace_members has UNIQUE(workspace_id, user_id), so
    // a user can only hold ONE role_id per workspace. Both rbac-provider and every
    // product permission hook (useServiceCloudPermissions, etc.) resolve permissions
    // by querying role_permissions WHERE role_id = workspace_members.role_id.
    //
    // Strategy:
    //   1. The owner's primary membership points to the 'sales' admin role.
    //   2. ALL cross-product permissions (sales, service_cloud, hrms, etc.) are
    //      written onto that sales admin role → owner effectively has admin access
    //      to every product through their single membership role.
    //   3. Each per-product admin role also gets its own product-scoped permissions
    //      seeded, so those roles are ready to use when invited team members are
    //      assigned a product-specific admin role.

    if (salesAdminRole && rolesData && rolesData.length > 0) {
      // ── Step 1: Owner's sales admin role gets ALL cross-product permissions ──
      const { data: allModules } = await supabase
        .from('crm_modules')
        .select('id')
        .eq('is_active', true);

      const allModuleIds = (allModules ?? []).map((m: any) => m.id);

      if (allModuleIds.length > 0) {
        const { data: allFeatures } = await supabase
          .from('crm_module_features')
          .select('id')
          .in('module_id', allModuleIds)
          .eq('is_active', true);

        if (allFeatures && allFeatures.length > 0) {
          const ownerPermissions = allFeatures.map((feature: any) => ({
            workspace_id: workspace.id,
            role_id: salesAdminRole.id,
            module_feature_id: feature.id,
            can_access: true,
            access_level: 'all' as const,
            can_view_sensitive_data: true,
            can_override_owner: true,
          }));

          const { error: ownerPermError } = await supabase
            .from('role_permissions')
            .insert(ownerPermissions);

          if (ownerPermError) {
            console.error(
              'Permissions creation error for owner (sales admin) role:',
              ownerPermError,
            );
          }
        }
      }

      // ── Step 2: Each per-product admin role gets its own product-scoped permissions ──
      // These roles are ready to assign to invited team members who need
      // product-specific admin access (e.g., an HRMS admin, a Service Cloud admin).
      for (const role of rolesData) {
        // Skip the sales admin role — already fully seeded above
        if (role.product_key === 'sales' || role.id === salesAdminRole.id) continue;

        const productKey = role.product_key as string;

        // Get modules for this specific product + common/shared modules
        const { data: productModules } = await supabase
          .from('crm_modules')
          .select('id')
          .in('product_key', [productKey, 'common'])
          .eq('is_active', true);

        const productModuleIds = (productModules ?? []).map((m: any) => m.id);
        if (productModuleIds.length === 0) continue;

        const { data: productFeatures } = await supabase
          .from('crm_module_features')
          .select('id')
          .in('module_id', productModuleIds)
          .eq('is_active', true);

        if (!productFeatures || productFeatures.length === 0) continue;

        const productPermissions = productFeatures.map((feature: any) => ({
          workspace_id: workspace.id,
          role_id: role.id,
          module_feature_id: feature.id,
          can_access: true,
          access_level: 'all' as const,
          can_view_sensitive_data: true,
          can_override_owner: true,
        }));

        const { error: productPermError } = await supabase
          .from('role_permissions')
          .insert(productPermissions);

        if (productPermError) {
          console.error(
            `Permissions creation error for ${productKey} admin role:`,
            productPermError,
          );
        }
      }
    }

    // Create 7-day trial seats for all modules (owner gets access to everything)
    await createTrialSeats(workspace.id, userId);

    return successDataResponse('Workspace created successfully', workspace);
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

  // Also create workspace_members records with module-scoped admin roles for the owner
  // This ensures RBAC can find the correct role for each module
  for (const product of products) {
    // Find the admin role for this product in this workspace
    const { data: adminRole } = await adminClient
      .from('workspace_roles')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('product_key', product.product_key)
      .eq('role_key', 'admin')
      .maybeSingle();

    if (adminRole) {
      if (!product.product_key) {
        console.warn(
          `Skipping workspace member creation for product ${product.id} because product_key is missing.`,
        );
      } else {
        // Check if workspace_member already exists for this product
        const { data: existingMember } = await adminClient
          .from('workspace_members')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('user_id', ownerUserId)
          .eq('product_key', product.product_key)
          .maybeSingle();

        if (!existingMember) {
          // Create workspace_member record with module-scoped admin role
          const { error: memberError } = await adminClient
            .from('workspace_members')
            .insert({
              workspace_id: workspaceId,
              user_id: ownerUserId,
              role_id: adminRole.id,
              product_key: product.product_key,
              product_id: product.id,
              status: 'accepted',
            });

          if (memberError) {
            console.error(
              `Failed to create workspace member for ${product.product_key}:`,
              memberError,
            );
          }
        }
      }
    }
  }
}


const updateWorkspace = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient() as any;
    const body = await request.json();
    
    if (!params?.id) {
      return NextResponse.json(
        { message: 'Workspace ID is required' },
        { status: 400 },
      );
    }

    const { data: workspace, error } = await supabase
      .from('workspaces')
      .update(body)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Workspace update error:', error);
      return NextResponse.json(
        { message: 'Failed to update workspace' },
        { status: 500 },
      );
    }

    return successDataResponse('Workspace updated successfully', workspace);
  },
);

export { createNewWorkspace, updateWorkspace };