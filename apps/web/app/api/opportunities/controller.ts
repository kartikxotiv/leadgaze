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
 * GET /api/opportunities
 * Fetch all opportunities for a workspace
 */
export const getOpportunities = catchAsync(
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
    const accountId = url.searchParams.get('accountId');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const searchTerm = url.searchParams.get('searchTerm') || '';
    const stageId = url.searchParams.get('stageId') || '';

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

    // Check permissions (Workspace Access)
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
        { count: 'exact' },
      )
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false);

    let hierarchyFilter:
      | { type: 'all' }
      | { type: 'restricted'; userIds: string[] } = { type: 'all' };
    let assignedOpportunityIds: string[] = [];

    if (!isOwner) {
      hierarchyFilter = await getHierarchyVisibleUserIds(
        adminClient,
        workspaceId,
        user.id,
      );
      if (hierarchyFilter.type === 'restricted') {
        const userIds = hierarchyFilter.userIds;

        // Fetch assigned opportunities for this user (only active assignments)
        const { data: assignments } = await adminClient
          .from('opportunity_assignees')
          .select('opportunity_id')
          .eq('workspace_id', workspaceId)
          .eq('assigned_to_user_id', user.id)
          .eq('assignment_status', 'active');

        assignedOpportunityIds = assignments?.map((a) => a.opportunity_id) || [];
        const assignedIdsFilter = assignedOpportunityIds.length > 0 
          ? `,id.in.(${assignedOpportunityIds.join(',')})` 
          : '';

        query = query.or(
          `owner_id.in.(${userIds.join(',')}),created_by.in.(${userIds.join(',')})${assignedIdsFilter}`,
        );
      }
    }

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    // Filter by stage if provided
    if (stageId && stageId !== 'all') {
      query = query.eq('stage_id', stageId);
    }

    // Search term
    if (searchTerm) {
      // Find accounts that match the search term
      const { data: matchedAccounts } = await adminClient
        .from('crm_accounts')
        .select('id')
        .eq('workspace_id', workspaceId)
        .ilike('account_name', `%${searchTerm}%`);

      const accountIds = matchedAccounts?.map((a) => a.id) || [];

      let orFilter = `opportunity_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`;

      if (accountIds.length > 0) {
        orFilter += `,account_id.in.(${accountIds.join(',')})`;
      }

      query = query.or(orFilter);
    }



    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const {
      data: opportunities,
      error,
      count,
    } = await query
      .order('created_at', {
        ascending: false,
      })
      .range(from, to);

    if (error) {
      console.error('Get opportunities error:', error);
      throw error;
    }

    // For stage breakdown, we need a query grouped by stage_id
    // We ignore the selected stageId filter here to show the whole pipeline
    let breakdownQuery = adminClient
      .from('crm_opportunities')
      .select('stage_id, amount')
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false);

    // Reuse the same filter from above
    if (!isOwner && hierarchyFilter.type === 'restricted') {
      const userIds = hierarchyFilter.userIds;
      const assignedIdsFilter = assignedOpportunityIds.length > 0 
        ? `,id.in.(${assignedOpportunityIds.join(',')})` 
        : '';
        
      breakdownQuery = breakdownQuery.or(`owner_id.in.(${userIds.join(',')}),created_by.in.(${userIds.join(',')})${assignedIdsFilter}`);
    }

    if (accountId) {
      breakdownQuery = breakdownQuery.eq('account_id', accountId);
    }

    if (searchTerm) {
      const { data: matchedAccounts } = await adminClient
        .from('crm_accounts')
        .select('id')
        .eq('workspace_id', workspaceId)
        .ilike('account_name', `%${searchTerm}%`);

      const accountIds = matchedAccounts?.map((a) => a.id) || [];

      let orFilter = `opportunity_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`;

      if (accountIds.length > 0) {
        orFilter += `,account_id.in.(${accountIds.join(',')})`;
      }

      breakdownQuery = breakdownQuery.or(orFilter);
    }

    // RLS handles visibility for breakdown as well.

    const { data: breakdownData, error: breakdownError } = await breakdownQuery;

    if (breakdownError) {
      console.error('Get stage breakdown error:', breakdownError);
      throw breakdownError;
    }

    const stageBreakdownMap: Record<
      string,
      { total_amount: number; count: number }
    > = {};
    (breakdownData || []).forEach((opp) => {
      const stageId = opp.stage_id;
      if (!stageBreakdownMap[stageId]) {
        stageBreakdownMap[stageId] = { total_amount: 0, count: 0 };
      }
      stageBreakdownMap[stageId].total_amount += opp.amount || 0;
      stageBreakdownMap[stageId].count += 1;
    });

    const totalAmount = Object.values(stageBreakdownMap).reduce(
      (sum, s) => sum + s.total_amount,
      0,
    );

    return NextResponse.json({
      message: 'Opportunities retrieved successfully',
      data: opportunities || [],
      count: count || 0,
      totalAmount,
      stageBreakdown: stageBreakdownMap,
    });
  },
);

/**
 * GET /api/opportunities/statuses
 * Fetch all stages for opportunities
 */
export const getOpportunityStages = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    const supabase = getSupabaseServerClient();
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
        { status: 400 },
      );
    }

    const { data: moduleData } = await supabase
      .from('crm_modules')
      .select('id')
      .eq('module_key', 'opportunities')
      .single();

    if (!moduleData?.id) {
      return successDataResponse('Stages retrieved successfully', []);
    }

    const { data: stages, error } = await supabase
      .from('entity_statuses')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('module_id', moduleData.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Get stages error:', error);
      throw error;
    }

    return successDataResponse('Stages retrieved successfully', stages || []);
  },
);

/**
 * POST /api/opportunities
 * Create a new opportunity
 */
export const createOpportunity = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    const supabase = getSupabaseServerClient();
    const body = await request.json();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const {
      opportunity_name,
      account_id,
      stage_id,
      workspace_id,
      amount,
      expected_close_date,
      probability,
      priority,
      opportunity_type,
      lead_source,
      description,
      competitor,
    } = body;

    if (!opportunity_name || !account_id || !stage_id || !workspace_id) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 },
      );
    }

    const { data: opportunity, error } = await supabase
      .from('crm_opportunities')
      .insert({
        workspace_id,
        account_id,
        stage_id,
        opportunity_name,
        amount: amount || 0,
        expected_close_date: expected_close_date || null,
        probability: probability || null,
        priority: priority || null,
        opportunity_type: opportunity_type || null,
        lead_source: lead_source || null,
        description: description || null,
        competitor: competitor || null,
        owner_id: user.id,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Create opportunity error:', error);
      throw error;
    }

    return successDataResponse('Opportunity created successfully', opportunity);
  },
);
