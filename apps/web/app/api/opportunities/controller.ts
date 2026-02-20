import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

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

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    // Filter by stage if provided
    if (stageId && stageId !== 'all') {
      query = query.eq('stage_id', stageId);
    }

    // Search term
    if (searchTerm) {
      query = query.or(
        `opportunity_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`,
      );
    }

    // If not owner, filter for public opportunities, opportunities assigned to current user, or opportunities created by current user
    if (!isOwner) {
      // Get opportunities assigned to the current user
      const { data: assignedOpportunityIds } = await (supabase
        .from('opportunity_assignees' as any)
        .select('opportunity_id')
        .eq('workspace_id', workspaceId)
        .eq('assigned_to_user_id', user.id)
        .eq('assignment_status', 'active') as any);

      const assignedIds =
        assignedOpportunityIds?.map((a: any) => a.opportunity_id) || [];

      // Filter: public opportunities OR assigned opportunities OR created by current user
      query = query.or(
        `is_public.eq.true,id.in.(${assignedIds.length > 0 ? assignedIds.join(',') : '00000000-0000-0000-0000-000000000000'}),created_by.eq.${user.id}`,
      );
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

    // For stage breakdown, we need a query grouped by stage_id
    // We ignore the selected stageId filter here to show the whole pipeline
    let breakdownQuery = supabase
      .from('crm_opportunities')
      .select('stage_id, amount')
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false);

    if (accountId) {
      breakdownQuery = breakdownQuery.eq('account_id', accountId);
    }

    if (searchTerm) {
      breakdownQuery = breakdownQuery.or(
        `opportunity_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`,
      );
    }

    if (!isOwner) {
      // Re-use logic for non-owners
      const { data: assignedOpportunityIds } = await (supabase
        .from('opportunity_assignees' as any)
        .select('opportunity_id')
        .eq('workspace_id', workspaceId)
        .eq('assigned_to_user_id', user.id)
        .eq('assignment_status', 'active') as any);

      const assignedIds =
        assignedOpportunityIds?.map((a: any) => a.opportunity_id) || [];

      breakdownQuery = breakdownQuery.or(
        `is_public.eq.true,id.in.(${assignedIds.length > 0 ? assignedIds.join(',') : '00000000-0000-0000-0000-000000000000'}),created_by.eq.${user.id}`,
      );
    }

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
