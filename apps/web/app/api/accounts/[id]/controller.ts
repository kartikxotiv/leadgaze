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
          owner:accounts!crm_accounts_owner_id_fkey(id, email, name)
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

    // Check permissions for is_public updates
    if (body.is_public !== undefined) {
      // Get the account to check permissions
      const { data: existingAccount } = await supabase
        .from('crm_accounts')
        .select('workspace_id, created_by')
        .eq('id', id)
        .single();

      if (existingAccount) {
        // Get workspace to check if user is owner
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('owner_id')
          .eq('id', existingAccount.workspace_id)
          .single();

        const isWorkspaceOwner = workspace?.owner_id === user.id;
        const isCreator = existingAccount.created_by === user.id;

        if (!isWorkspaceOwner && !isCreator) {
          return NextResponse.json(
            { message: 'Only workspace owner or creator can change visibility' },
            { status: 403 },
          );
        }
      }
    }

    const { data: account, error } = await supabase
      .from('crm_accounts')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update account error:', error);
      throw error;
    }

    return successDataResponse('Account updated successfully', account);
  },
);
