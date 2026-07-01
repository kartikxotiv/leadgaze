import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { Database } from '../../../lib/database.types';
import {
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';

import {
  buildOpportunityCurrencyFields,
} from '@kit/shared/currency';
// Direct columns: sorted at DB level
const OPPORTUNITY_DIRECT_SORT_COLUMNS: Record<string, string> = {
  opportunity_name:     'opportunity_name',
  amount:               'amount',
  currency:             'currency',
  probability:          'probability',
  expected_close_date:  'expected_close_date',
  priority:             'priority',
  opportunity_type:     'opportunity_type',
  lead_source:          'lead_source',
  competitor:           'competitor',
  is_closed:            'is_closed',
  is_won:               'is_won',
  created_at:           'created_at',
};

// Relational columns: sorted in Node.js after fetch.
// Supabase's foreignTable in .order() only sorts nested children, NOT parent rows.
const OPPORTUNITY_RELATIONAL_SORT_COLUMNS: Record<string, string> = {
  'account.account_name':        'account.account_name',
  'stage.status_name':           'stage.status_name',
  'owner.name':                  'owner.name',
  'created_by_account.name':     'created_by_account.name',
  'updated_by_account.name':     'updated_by_account.name',
};

const getNestedValue = (obj: Record<string, unknown>, path: string): string => {
  const value = path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
  return typeof value === 'string' ? value.toLowerCase() : '';
};

/**
 * GET /api/opportunities
 * Fetch all opportunities for a workspace
 * Optimized: uses resolve_workspace_access RPC (1 DB call) instead of 5-8 sequential auth/hierarchy queries.
 * Account-search pre-query results are cached and reused for breakdown. Main + breakdown run in Promise.all.
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
    const sortColumn = url.searchParams.get('sortColumn') || '';
    const sortDirection = url.searchParams.get('sortDirection') || '';

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

    // Single RPC call replaces: workspace owner check, membership check,
    // and 3-5 queries inside getHierarchyVisibleUserIds
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { data: accessResult, error: accessError } = await (
      adminClient as any
    ).rpc('resolve_workspace_access', {
      p_workspace_id: workspaceId,
      p_user_id: user.id,
      p_user_email: user.email || null,
      p_require_shared_team: false,
    });
    /* eslint-enable @typescript-eslint/no-explicit-any */

    if (accessError) {
      console.error('Workspace access resolution error:', accessError);
      throw accessError;
    }

    const {
      is_owner: isOwner,
      is_member: isMember,
      hierarchy_type: hierarchyType,
      visible_user_ids: rpcVisibleUserIds,
    } = accessResult;

    if (!isOwner && !isMember) {
      return NextResponse.json(
        { message: 'Forbidden: You are not a member of this workspace' },
        { status: 403 },
      );
    }

    const visibleUserIds: string[] | null = rpcVisibleUserIds ?? null;
    let assignedOpportunityIds: string[] = [];

    if (
      !isOwner &&
      hierarchyType === 'restricted' &&
      visibleUserIds &&
      visibleUserIds.length > 0
    ) {
      // Fetch assigned opportunities for this user (only active assignments)
      const { data: assignments } = await adminClient
        .from('opportunity_assignees')
        .select('opportunity_id')
        .eq('workspace_id', workspaceId)
        .eq('assigned_to_user_id', user.id)
        .eq('assignment_status', 'active');

      assignedOpportunityIds = assignments?.map((a) => a.opportunity_id) || [];
    }

    // Pre-compute account-search matched IDs once (was running twice: for main + breakdown)
    let matchedAccountIds: string[] = [];
    if (searchTerm) {
      const { data: matchedAccounts } = await adminClient
        .from('crm_accounts')
        .select('id')
        .eq('workspace_id', workspaceId)
        .ilike('account_name', `%${searchTerm}%`);
      matchedAccountIds = matchedAccounts?.map((a) => a.id) || [];
    }

    // Helper to build the common search filter string
    const buildSearchOrFilter = () => {
      let orFilter = `opportunity_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`;
      if (matchedAccountIds.length > 0) {
        orFilter += `,account_id.in.(${matchedAccountIds.join(',')})`;
      }
      return orFilter;
    };

    // Helper to apply hierarchy + assignee filter to a query
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const applyAccessFilter = (q: any) => {
      if (!isOwner && visibleUserIds && visibleUserIds.length > 0) {
        const assignedIdsFilter =
          assignedOpportunityIds.length > 0
            ? `,id.in.(${assignedOpportunityIds.join(',')})`
            : '';
        q = q.or(
          `owner_id.in.(${visibleUserIds.join(',')}),created_by.in.(${visibleUserIds.join(',')})${assignedIdsFilter}`,
        );
      }
      return q;
    };
    /* eslint-enable @typescript-eslint/no-explicit-any */

    // Build main query
    let mainQuery = applyAccessFilter(
      adminClient
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
        .eq('is_deleted', false),
    );

    if (accountId) {
      mainQuery = mainQuery.eq('account_id', accountId);
    }

    if (stageId && stageId !== 'all') {
      mainQuery = mainQuery.eq('stage_id', stageId);
    }

    if (searchTerm) {
      mainQuery = mainQuery.or(buildSearchOrFilter());
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build breakdown query (no stage filter, no pagination)
    let breakdownQuery = applyAccessFilter(
      adminClient
        .from('crm_opportunities')
        .select('stage_id, amount')
        .eq('workspace_id', workspaceId)
        .eq('is_deleted', false),
    );

    if (accountId) {
      breakdownQuery = breakdownQuery.eq('account_id', accountId);
    }

    if (searchTerm) {
      breakdownQuery = breakdownQuery.or(buildSearchOrFilter());
    }

    // Run main + breakdown queries in parallel
    const isRelationalSort = !!OPPORTUNITY_RELATIONAL_SORT_COLUMNS[sortColumn];
    const isDirectSort = !!OPPORTUNITY_DIRECT_SORT_COLUMNS[sortColumn];

    let finalMainQuery;
    if (isDirectSort) {
      finalMainQuery = mainQuery
        .order(OPPORTUNITY_DIRECT_SORT_COLUMNS[sortColumn]!, {
          ascending: sortDirection === 'asc',
          nullsFirst: false,
        })
        .range(from, to);
    } else if (isRelationalSort) {
      // Fetch all rows so we can sort in Node.js, then slice
      finalMainQuery = mainQuery.order('created_at', { ascending: false });
    } else {
      finalMainQuery = mainQuery.order('created_at', { ascending: false }).range(from, to);
    }

    const [mainResult, breakdownResult] = await Promise.all([
      finalMainQuery,
      breakdownQuery,
    ]);

    const { data: opportunitiesRaw, error, count } = mainResult;
    if (error) {
      console.error('Get opportunities error:', error);
      throw error;
    }

    const { data: breakdownData, error: breakdownError } = breakdownResult;
    if (breakdownError) {
      console.error('Get stage breakdown error:', breakdownError);
      throw breakdownError;
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    let sortedOpportunities: any[] = opportunitiesRaw || [];
    if (isRelationalSort && OPPORTUNITY_RELATIONAL_SORT_COLUMNS[sortColumn]) {
      const accessor = OPPORTUNITY_RELATIONAL_SORT_COLUMNS[sortColumn]!;
      const ascending = sortDirection === 'asc';
      sortedOpportunities = [...sortedOpportunities].sort((a, b) => {
        const aVal = getNestedValue(a, accessor);
        const bVal = getNestedValue(b, accessor);
        if (aVal < bVal) return ascending ? -1 : 1;
        if (aVal > bVal) return ascending ? 1 : -1;
        return 0;
      });
      sortedOpportunities = sortedOpportunities.slice(from, to + 1);
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */

    const stageBreakdownMap: Record<
      string,
      { total_amount: number; count: number }
    > = {};
    (breakdownData || []).forEach(
      (opp: { stage_id: string; amount: number | null }) => {
        const sid = opp.stage_id;
        if (!stageBreakdownMap[sid]) {
          stageBreakdownMap[sid] = { total_amount: 0, count: 0 };
        }
        stageBreakdownMap[sid].total_amount += opp.amount || 0;
        stageBreakdownMap[sid].count += 1;
      },
    );

    const totalAmount = Object.values(stageBreakdownMap).reduce(
      (sum, s) => sum + s.total_amount,
      0,
    );

    return NextResponse.json({
      message: 'Opportunities retrieved successfully',
      data: sortedOpportunities,
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
      currency: currency_original,
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

    // =====================================================
    // MULTI-CURRENCY: Resolve base_amount_usd
    // =====================================================
    let currencyFields = {};
    const oppCurrency = currency_original || 'USD';
    const oppAmount = amount || 0;

    if (oppAmount && oppCurrency) {
      try {
        // Fetch latest exchange rate for USD -> oppCurrency
        const adminClient = getSupabaseServerAdminClient();
        const { data: rates } = await adminClient
        .schema('core')
          .from('currency_exchange_rates')
          .select('*')
          .eq('base_currency', 'USD')
          .eq('target_currency', oppCurrency.toUpperCase())
          .order('fetched_at', { ascending: false })
          .limit(1);

        if (rates && rates.length > 0) {
          const rate = rates[0];
          currencyFields = buildOpportunityCurrencyFields({
            amount: oppAmount,
            currency: oppCurrency,
            exchangeRateToUsd: rate.exchange_rate,
            rateDate: rate.fetched_at.split('T')[0],
          });
        }
      } catch (rateError) {
        console.error('Failed to fetch exchange rate:', rateError);
        // Proceed without base_amount_usd if rate fetch fails
      }
    }

    const { data: opportunity, error } = await supabase
      .from('crm_opportunities')
      .insert({
        workspace_id,
        account_id,
        stage_id,
        opportunity_name,
        amount: oppAmount,
        currency: oppCurrency,
        expected_close_date: expected_close_date || null,
        probability: probability || null,
        priority: priority || null,
        opportunity_type: opportunity_type || null,
        lead_source: lead_source || null,
        description: description || null,
        competitor: competitor || null,
        owner_id: user.id,
        created_by: user.id,
        ...currencyFields,
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

/**
 * POST /api/opportunities/statuses
 * Create a new opportunity stage
 */
export const createOpportunityStage = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    const supabase = getSupabaseServerClient();
    const body = await request.json();
    const { workspace_id, status_name, color, icon, is_closed } = body;

    if (!workspace_id || !status_name) {
      return NextResponse.json(
        { message: 'workspace_id and status_name are required' },
        { status: 400 },
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { data: moduleData, error: moduleError } = await supabase
      .from('crm_modules')
      .select('id')
      .eq('module_key', 'opportunities')
      .single();

    if (moduleError || !moduleData) {
      console.error('Get module error:', moduleError);
      return NextResponse.json(
        { message: 'Failed to retrieve module information' },
        { status: 500 },
      );
    }

    const status_key = status_name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    const { data: maxSort } = await supabase
      .from('entity_statuses')
      .select('sort_order')
      .eq('workspace_id', workspace_id)
      .eq('module_id', moduleData.id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const sort_order = (maxSort?.sort_order ?? -1) + 1;

    const { data: stageRecord, error } = await supabase
      .from('entity_statuses')
      .insert({
        workspace_id,
        module_id: moduleData.id,
        status_name: status_name.trim(),
        status_key,
        color: color || '#3B82F6',
        icon: icon || null,
        is_active: true,
        is_system: false,
        is_default: false,
        is_closed: !!is_closed,
        sort_order,
        created_by: user.id,
      })
      .select('id, status_name, status_key, color, icon, is_closed')
      .single();

    if (error) {
      console.error('Create stage error:', error);
      throw error;
    }

    return successDataResponse('Stage created successfully', stageRecord);
  },
);

/**
 * PATCH /api/opportunities/statuses/[id]
 * Update an opportunity stage
 */
export const updateOpportunityStage = catchAsync(
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
    const { status_name, color, icon, is_closed, is_active } = body;

    if (!id) {
      return NextResponse.json(
        { message: 'stage id is required' },
        { status: 400 },
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const updateData: any = {};
    if (status_name !== undefined) {
      updateData.status_name = status_name.trim();
      updateData.status_key = status_name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    }
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;
    if (is_closed !== undefined) updateData.is_closed = is_closed;
    if (is_active !== undefined) updateData.is_active = is_active;
    updateData.updated_by = user.id;
    updateData.updated_at = new Date().toISOString();
    /* eslint-enable @typescript-eslint/no-explicit-any */

    const { data: stageRecord, error } = await supabase
      .from('entity_statuses')
      .update(updateData)
      .eq('id', id)
      .select('id, status_name, status_key, color, icon, is_closed')
      .single();

    if (error) {
      console.error('Update stage error:', error);
      throw error;
    }

    return successDataResponse('Stage updated successfully', stageRecord);
  },
);

/**
 * DELETE /api/opportunities/statuses/[id]
 * Delete an opportunity stage
 */
export const deleteOpportunityStage = catchAsync(
  async ({
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const id = params?.id;

    if (!id) {
      return NextResponse.json(
        { message: 'stage id is required' },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from('entity_statuses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete stage error:', error);
      throw error;
    }

    return successDataResponse('Stage deleted successfully', { id });
  },
);

