import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { Database } from '../../../lib/database.types';
import { getHierarchyVisibleUserIds } from '../../../lib/permissions/hierarchy-utils';
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
    const adminClient = getSupabaseServerAdminClient<Database>();
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
    const { data: workspace, error: workspaceError } = await adminClient
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();

    if (workspaceError) {
      console.error('Workspace fetch error:', workspaceError);
      throw workspaceError;
    }

    const isOwner = workspace?.owner_id === user.id;

    const { data: membership } = await adminClient
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .maybeSingle();

    if (!isOwner && !membership) {
      return NextResponse.json(
        { message: 'Forbidden: You are not a member of this workspace' },
        { status: 403 },
      );
    }

    // Build the query
    let query = adminClient
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

    // Apply hierarchy-based visibility filtering.
    // Workspace owners bypass all hierarchy restrictions.
    if (!isOwner) {
      const hierarchyFilter = await getHierarchyVisibleUserIds(
        adminClient,
        workspaceId,
        user.id,
      );
      if (hierarchyFilter.type === 'restricted') {
        const userIds = hierarchyFilter.userIds;

        // Fetch assigned accounts for this user (only active assignments)
        const { data: assignments } = await adminClient
          .from('account_assignees')
          .select('account_id')
          .eq('workspace_id', workspaceId)
          .eq('assigned_to_user_id', user.id)
          .eq('assignment_status', 'active');

        const assignedIds = assignments?.map((a) => a.account_id) || [];
        const assignedIdsFilter = assignedIds.length > 0 
          ? `,id.in.(${assignedIds.join(',')})` 
          : '';

        query = query.or(
          `owner_id.in.(${userIds.join(',')}),created_by.in.(${userIds.join(',')})${assignedIdsFilter}`,
        );
      }
    }

    // Search term
    if (searchTerm) {
      query = query.or(
        `account_name.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%`,
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
