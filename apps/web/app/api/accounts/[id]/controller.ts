import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { catchAsync, successDataResponse } from '~/utils/response-handler';

/**
 * GET /api/accounts/[id]
 * Fetch a single account by ID
 */
export const getAccountById = catchAsync(
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
        { message: 'Account ID is required' },
        { status: 400 },
      );
    }

    const { data: account, error } = await supabase
      .from('crm_accounts')
      .select(
        `
          *,
          status:entity_statuses(id, status_name, status_key, color, icon),
          industry:crm_industries(id, industry_name),
          owner:accounts!crm_accounts_owner_id_fkey(id, email, name),
          updated_by_account:accounts!crm_accounts_updated_by_fkey(id, email, name)
        `,
      )
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error) {
      console.error('Get account error:', error);
      return NextResponse.json(
        { message: 'Account not found' },
        { status: 404 },
      );
    }

    return successDataResponse('Account retrieved successfully', account);
  },
);

/**
 * PATCH /api/accounts/[id]
 * Update an account
 */
export const updateAccount = catchAsync(
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
        { message: 'Account ID is required' },
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

    // Get the account to check permissions
    const { data: existingAccount } = await supabase
      .from('crm_accounts')
      .select('workspace_id, owner_id, created_by')
      .eq('id', id)
      .single();

    if (!existingAccount) {
      return NextResponse.json({ message: 'Account not found' }, { status: 404 });
    }

    // Get workspace to check if user is owner
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', existingAccount.workspace_id)
      .single();

    const isWorkspaceOwner = workspace?.owner_id === user.id;
    const isOwner = existingAccount.owner_id === user.id;
    const isCreator = existingAccount.created_by === user.id;

    // Check general edit permission
    let hasEditPermission = isWorkspaceOwner || isOwner || isCreator;

    if (!hasEditPermission) {
      const { data: member } = await supabase
        .from('workspace_members')
        .select('role_id')
        .eq('user_id', user.id)
        .eq('workspace_id', existingAccount.workspace_id)
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
          .eq('crm_module_features.crm_modules.module_key', 'accounts')
          .single();

        if (permission?.can_access) {
          hasEditPermission = true;
        }
      }
    }

    if (!hasEditPermission) {
      return NextResponse.json(
        { message: 'You do not have permission to edit this account' },
        { status: 403 },
      );
    }


    const { data: account, error } = await supabase
      .from('crm_accounts')
      .update({
        ...body,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(
        `
          *,
          status:entity_statuses(id, status_name, status_key, color, icon),
          industry:crm_industries(id, industry_name),
          owner:accounts!crm_accounts_owner_id_fkey(id, email, name),
          updated_by_account:accounts!crm_accounts_updated_by_fkey(id, email, name)
        `
      )
      .single();

    if (error) {
      console.error('Update account error:', error);
      throw error;
    }

    return successDataResponse('Account updated successfully', account);
  },
);

/**
 * DELETE /api/accounts/[id]
 * Soft delete an account
 */
export const deleteAccount = catchAsync(
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
        { message: 'Account ID is required' },
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
    // Get the account to check permissions
    const { data: existingAccount } = await supabase
      .from('crm_accounts')
      .select('workspace_id, owner_id, created_by')
      .eq('id', id)
      .single();

    if (!existingAccount) {
      return NextResponse.json(
        { message: 'Account not found' },
        { status: 404 },
      );
    }

    // Get workspace to check if user is owner
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', existingAccount.workspace_id)
      .single();

    const isWorkspaceOwner = workspace?.owner_id === user.id;
    const isOwner = existingAccount.owner_id === user.id;
    let hasPermission = isWorkspaceOwner || isOwner;

    // If not owner, check RBAC permissions
    if (!hasPermission) {
      const { data: member } = await supabase
        .from('workspace_members')
        .select('role_id')
        .eq('user_id', user.id)
        .eq('workspace_id', existingAccount.workspace_id)
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
          .eq('crm_module_features.crm_modules.module_key', 'accounts')
          .single();

        if (permission?.can_access) {
          hasPermission = true;
        }
      }
    }

    if (!hasPermission) {
      return NextResponse.json(
        { message: 'You do not have permission to delete this account' },
        { status: 403 },
      );
    }

    // Soft delete account
    const { data: account, error } = await supabase
      .from('crm_accounts')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Delete account error:', error);
      throw error;
    }

    return successDataResponse('Account deleted successfully', account);
  },
);
