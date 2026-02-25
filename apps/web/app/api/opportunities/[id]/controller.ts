import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { catchAsync, successDataResponse } from '~/utils/response-handler';

/**
 * GET /api/opportunities/[id]
 * Fetch a single opportunity by ID
 */
export const getOpportunityById = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const id = params?.id;

    if (!id) {
      return NextResponse.json(
        { message: 'Opportunity ID is required' },
        { status: 400 },
      );
    }

    const { data: opportunity, error } = await supabase
      .from('crm_opportunities')
      .select(
        `
          *,
          stage:entity_statuses(id, status_name, status_key, color, icon),
          account:crm_accounts(id, account_name),
          owner:accounts!crm_opportunities_owner_id_fkey(id, email, name),
          created_by_account:accounts!crm_opportunities_created_by_fkey(id, email, name),
          updated_by_account:accounts!crm_opportunities_updated_by_fkey(id, email, name)
        `,
      )
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error) {
      console.error('Get opportunity error:', error);
      return NextResponse.json(
        { message: 'Opportunity not found' },
        { status: 404 },
      );
    }

    return successDataResponse(
      'Opportunity retrieved successfully',
      opportunity,
    );
  },
);

/**
 * PATCH /api/opportunities/[id]
 * Update an opportunity
 */
export const updateOpportunity = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const id = params?.id;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { message: 'Opportunity ID is required' },
        { status: 400 },
      );
    }

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Get the opportunity to check permissions
    const { data: existingOpportunity } = await supabase
      .from('crm_opportunities')
      .select('workspace_id, owner_id, created_by, is_public')
      .eq('id', id)
      .single();

    if (!existingOpportunity) {
      return NextResponse.json({ message: 'Opportunity not found' }, { status: 404 });
    }

    // Get workspace to check if user is owner
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', existingOpportunity.workspace_id)
      .single();

    const isWorkspaceOwner = workspace?.owner_id === user.id;
    const isOwner = existingOpportunity.owner_id === user.id;
    const isCreator = existingOpportunity.created_by === user.id;

    // Check general edit permission
    let hasEditPermission = isWorkspaceOwner || isOwner || isCreator;

    if (!hasEditPermission) {
      const { data: member } = await supabase
        .from('workspace_members')
        .select('role_id')
        .eq('user_id', user.id)
        .eq('workspace_id', existingOpportunity.workspace_id)
        .single();

      if (member?.role_id) {
        const { data: permission } = await supabase
          .from('role_permissions')
          .select(
            `
            can_access,
            crm_module_features!inner (
              feature_key,
              crm_modules!inner (
                module_key
              )
            )
          `,
          )
          .eq('role_id', member.role_id)
          .eq('crm_module_features.feature_key', 'edit')
          .eq('crm_module_features.crm_modules.module_key', 'opportunities')
          .single();

        if (permission?.can_access) {
          hasEditPermission = true;
        }
      }
    }

    if (!hasEditPermission) {
      return NextResponse.json(
        { message: 'You do not have permission to edit this opportunity' },
        { status: 403 },
      );
    }

    // Check permissions for is_public updates - Only if value is CHANGING
    if (
      body.is_public !== undefined &&
      body.is_public !== existingOpportunity.is_public
    ) {
      if (!isWorkspaceOwner && !isCreator) {
        return NextResponse.json(
          { message: 'Only workspace owner or creator can change visibility' },
          { status: 403 },
        );
      }
    }

    const { data: opportunity, error } = await supabase
      .from('crm_opportunities')
      .update({
        ...body,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(
        `
          *,
          stage:entity_statuses(id, status_name, status_key, color, icon),
          account:crm_accounts(id, account_name),
          owner:accounts!crm_opportunities_owner_id_fkey(id, email, name),
          created_by_account:accounts!crm_opportunities_created_by_fkey(id, email, name),
          updated_by_account:accounts!crm_opportunities_updated_by_fkey(id, email, name)
        `
      )
      .single();

    if (error) {
      console.error('Update opportunity error:', error);
      throw error;
    }

    return successDataResponse('Opportunity updated successfully', opportunity);
  },
);

/**
 * DELETE /api/opportunities/[id]
 * Soft delete an opportunity
 */
export const deleteOpportunity = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const id = params?.id;

    if (!id) {
      return NextResponse.json(
        { message: 'Opportunity ID is required' },
        { status: 400 },
      );
    }

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    // Get the opportunity to check permissions
    const { data: existingOpportunity } = await supabase
      .from('crm_opportunities')
      .select('workspace_id, owner_id, created_by')
      .eq('id', id)
      .single();

    if (!existingOpportunity) {
      return NextResponse.json(
        { message: 'Opportunity not found' },
        { status: 404 },
      );
    }

    // Get workspace to check if user is owner
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', existingOpportunity.workspace_id)
      .single();

    const isWorkspaceOwner = workspace?.owner_id === user.id;
    const isOwner = existingOpportunity.owner_id === user.id;
    let hasPermission = isWorkspaceOwner || isOwner;

    // If not owner, check RBAC permissions
    if (!hasPermission) {
      const { data: member } = await supabase
        .from('workspace_members')
        .select('role_id')
        .eq('user_id', user.id)
        .eq('workspace_id', existingOpportunity.workspace_id)
        .single();

      if (member?.role_id) {
        const { data: permission } = await supabase
          .from('role_permissions')
          .select(
            `
            can_access,
            crm_module_features!inner (
              feature_key,
              crm_modules!inner (
                module_key
              )
            )
          `,
          )
          .eq('role_id', member.role_id)
          .eq('crm_module_features.feature_key', 'delete')
          .eq('crm_module_features.crm_modules.module_key', 'opportunities')
          .single();

        if (permission?.can_access) {
          hasPermission = true;
        }
      }
    }

    if (!hasPermission) {
      return NextResponse.json(
        { message: 'You do not have permission to delete this opportunity' },
        { status: 403 },
      );
    }

    // Soft delete opportunity
    const { data: opportunity, error } = await supabase
      .from('crm_opportunities')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Delete opportunity error:', error);
      throw error;
    }

    return successDataResponse(
      'Opportunity deleted successfully',
      opportunity,
    );
  },
);
