import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';

/**
 * GET /api/accounts
 * Fetch all accounts for a workspace
 */
export const getAccounts = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const searchTerm = url.searchParams.get('searchTerm') || '';

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
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

    // Check if user is workspace owner
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();

    if (workspaceError) {
      console.error('Workspace fetch error:', workspaceError);
      throw workspaceError;
    }

    const isOwner = workspace?.owner_id === user.id;

    // Build the query
    let query = supabase
      .from('crm_accounts')
      .select(
        `
          *,
          status:entity_statuses(id, status_name, status_key, color, icon),
          owner:accounts!crm_accounts_owner_id_fkey(id, email, name),
          created_by_account:accounts!crm_accounts_created_by_fkey(id, email, name),
          industry:crm_industries(id, industry_name)
        `,
        { count: 'exact' },
      )
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false);

    // Search term
    if (searchTerm) {
      query = query.or(
        `account_name.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%`,
      );
    }

    // If not owner, filter for public accounts, accounts assigned to current user, or accounts created by current user
    if (!isOwner) {
      // Get accounts assigned to the current user
      const { data: assignedAccountIds } = await (supabase
        .from('account_assignees' as any)
        .select('account_id')
        .eq('workspace_id', workspaceId)
        .eq('assigned_to_user_id', user.id)
        .eq('assignment_status', 'active') as any);

      const assignedIds =
        assignedAccountIds?.map((a: any) => a.account_id) || [];

      // Filter: public accounts OR assigned accounts OR created by current user
      query = query.or(
        `is_public.eq.true,id.in.(${assignedIds.length > 0 ? assignedIds.join(',') : '00000000-0000-0000-0000-000000000000'}),created_by.eq.${user.id}`,
      );
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const {
      data: accounts,
      error,
      count,
    } = await query
      .order('created_at', {
        ascending: false,
      })
      .range(from, to);

    if (error) {
      console.error('Get accounts error:', error);
      throw error;
    }

    return NextResponse.json({
      message: 'Accounts retrieved successfully',
      data: accounts || [],
      count: count || 0,
    });
  },
);

/**
 * POST /api/accounts
 * Create a new account
 */
export const createAccount = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    const supabase = getSupabaseServerClient();
    const payload = await request.json();
    const { workspaceId, account_name, ...rest } = payload;

    if (!workspaceId || !account_name) {
      return NextResponse.json(
        { message: 'workspaceId and account_name are required' },
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

    // Get default status for accounts if not provided
    let statusId = payload.status_id;
    if (!statusId) {
      const { data: status } = await supabase
        .from('entity_statuses')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('status_key', 'active') // Assuming active is default for accounts?
        // Actually accounts migration didn't seed specific keys like leads.
        // Let's just pick the first active one or is_default = true.
        .eq('is_default', true)
        .eq('is_active', true)
        .single();

      statusId = status?.id;

      if (!statusId) {
        // Fallback to any active status for this module if no default
        const { data: fallbackStatus } = await supabase
          .from('entity_statuses')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('is_active', true)
          .limit(1)
          .single();

        statusId = fallbackStatus?.id;
      }
    }

    if (!statusId) {
      return NextResponse.json(
        {
          message:
            'No active status found for workspace. Please configure statuses.',
        },
        { status: 400 },
      );
    }

    // Clean rest payload to prevent UUID errors (convert empty strings to null)
    const cleanedData: Record<string, any> = {};
    Object.keys(rest).forEach((key) => {
      cleanedData[key] = rest[key] === '' ? null : rest[key];
    });

    const { data: account, error } = await supabase
      .from('crm_accounts')
      .insert({
        workspace_id: workspaceId,
        account_name,
        status_id: statusId,
        owner_id: user.id,
        created_by: user.id,
        is_public: payload.is_public ?? true, // Default to public
        ...cleanedData,
      })
      .select()
      .single();

    if (error) {
      console.error('Create account error:', error);
      throw error;
    }

    return successDataResponse('Account created successfully', account);
  },
);
