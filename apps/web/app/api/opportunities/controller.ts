import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { Database } from '@kit/supabase/database';
import {
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';

import {
  buildOpportunityCurrencyFields,
} from '@kit/shared/currency';

// Column mapping for direct SQL sorting
const OPPORTUNITY_SORT_COLUMNS: Record<string, string> = {
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
  'account.account_name':    'account_name',
  'stage.status_name':       'stage_name',
  'owner.name':              'owner_name',
  'created_by_account.name': 'created_by_account_name',
  'updated_by_account.name': 'updated_by_account_name',
};

/**
 * GET /api/opportunities
 * Fetch opportunities for a workspace with direct SQL sorting via vw_crm_opportunities_list
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
    const createdAtFrom = url.searchParams.get('createdAtFrom') || '';
    const createdAtTo = url.searchParams.get('createdAtTo') || '';
    const updatedAtFrom = url.searchParams.get('updatedAtFrom') || '';
    const updatedAtTo = url.searchParams.get('updatedAtTo') || '';
    const createdByIds = url.searchParams.get('createdByIds') || '';

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

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { data: accessResult, error: accessError } = await (
      adminClient as any
    ).rpc('resolve_workspace_access', {
      p_workspace_id: workspaceId,
      p_user_id: user.id,
      p_user_email: user.email || null,
      p_require_shared_team: false,
    });

    if (accessError || !accessResult) {
      console.error('Workspace access resolution error:', accessError);
      return NextResponse.json(
        { message: 'Failed to verify workspace access' },
        { status: 500 },
      );
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
    if (!isOwner && hierarchyType === 'restricted' && visibleUserIds && visibleUserIds.length > 0) {
      const { data: assignments } = await (adminClient as any)
        .from('opportunity_assignees')
        .select('opportunity_id')
        .eq('workspace_id', workspaceId)
        .eq('assigned_to_user_id', user.id)
        .eq('assignment_status', 'active');

      assignedOpportunityIds = assignments?.map((a: any) => a.opportunity_id) || [];
    }

    const { OpportunitiesService } = await import('@kit/sales');
    const opportunitiesService = new OpportunitiesService(adminClient as any);

    const { data: sortedOpportunities, count, totalAmount, stageBreakdown } =
      await opportunitiesService.getOpportunitiesList({
        workspaceId,
        accountId: accountId || undefined,
        page,
        limit,
        searchTerm,
        stageId: stageId || undefined,
        sortColumn,
        sortDirection,
        createdAtFrom,
        createdAtTo,
        updatedAtFrom,
        updatedAtTo,
        createdByIds,
        isOwner,
        visibleUserIds: visibleUserIds || undefined,
        assignedOpportunityIds,
      });

    return NextResponse.json({
      message: 'Opportunities retrieved successfully',
      data: sortedOpportunities,
      count: count || 0,
      totalAmount,
      stageBreakdown,
    });
  },
);

/**
 * GET /api/opportunities/statuses
 * Fetch all stages for opportunities
 * Supports ?includeInactive=true to return all stages (for management dialog)
 */
export const getOpportunityStages = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    const supabase = getSupabaseServerClient();
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId');
    const includeInactive = url.searchParams.get('includeInactive') === 'true';

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

    let query = supabase
      .from('entity_statuses')
      .select('id, status_name, status_key, color, icon, is_closed, is_active, is_system, is_default, sort_order')
      .eq('workspace_id', workspaceId)
      .eq('module_id', moduleData.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data: stages, error } = await query;

    if (error) {
      console.error('Get stages error:', error);
      throw error;
    }

    return successDataResponse('Stages retrieved successfully', stages || []);
  },
);

/**
 * GET /api/opportunities/statuses/[id]/affected
 * Get count + first N opportunities using this stage (for pre-disable confirmation modal)
 */
export const getAffectedOpportunities = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const adminClient = getSupabaseServerAdminClient<Database>();
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId');
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const stageId = params?.id;

    if (!workspaceId || !stageId) {
      return NextResponse.json(
        { message: 'workspaceId and stage id are required' },
        { status: 400 },
      );
    }

    const { data: records, error, count } = await adminClient
      .from('crm_opportunities')
      .select('id, opportunity_name', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .eq('stage_id', stageId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Get affected opportunities error:', error);
      throw error;
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const mapped = (records || []).map((r: any) => ({
      id: r.id,
      name: r.opportunity_name,
    }));
    /* eslint-enable @typescript-eslint/no-explicit-any */

    return successDataResponse('Affected opportunities retrieved successfully', {
      total_count: count ?? 0,
      records: mapped,
    });
  },
);

/**
 * PATCH /api/opportunities/statuses/[id]/reassign
 * Bulk-reassign all opportunities from old stage to new stage, then disable old stage.
 * Body: { new_status_id: string, workspace_id: string }
 */
export const reassignOpportunityStage = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const adminClient = getSupabaseServerAdminClient<Database>();
    const oldStageId = params?.id;
    const body = await request.json();
    const { new_status_id, workspace_id } = body;

    if (!oldStageId || !new_status_id || !workspace_id) {
      return NextResponse.json(
        { message: 'id, new_status_id, and workspace_id are required' },
        { status: 400 },
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Validate new stage is active and belongs to the same workspace
    const { data: newStage } = await adminClient
      .from('entity_statuses')
      .select('id, is_active')
      .eq('id', new_status_id)
      .eq('workspace_id', workspace_id)
      .eq('is_active', true)
      .single();

    if (!newStage) {
      return NextResponse.json(
        { message: 'New stage not found or is not active' },
        { status: 400 },
      );
    }

    // Bulk update all affected opportunities
    const { count: reassignedCount, error: updateError } = await adminClient
      .from('crm_opportunities')
      .update({ stage_id: new_status_id, updated_by: user.id, updated_at: new Date().toISOString() })
      .eq('workspace_id', workspace_id)
      .eq('stage_id', oldStageId)
      .eq('is_deleted', false);

    if (updateError) {
      console.error('Reassign opportunities error:', updateError);
      throw updateError;
    }

    // Now disable the old stage
    const { error: disableError } = await adminClient
      .from('entity_statuses')
      .update({ is_active: false, updated_by: user.id, updated_at: new Date().toISOString() })
      .eq('id', oldStageId);

    if (disableError) {
      console.error('Disable stage error:', disableError);
      throw disableError;
    }

    return successDataResponse('Opportunities reassigned and stage disabled successfully', {
      reassigned_count: reassignedCount ?? 0,
      disabled_status_id: oldStageId,
    });
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

/**
 * PUT /api/opportunities/statuses/reorder
 * Bulk-update sort_order for opportunity stages.
 * Body: { workspaceId: string, orderedStatusIds: string[] }
 */
export const reorderOpportunityStages = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const body = await request.json();
    const { workspaceId, orderedStatusIds } = body;

    if (!workspaceId || !Array.isArray(orderedStatusIds)) {
      return NextResponse.json(
        { message: 'workspaceId and orderedStatusIds array are required' },
        { status: 400 },
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const updatePromises = orderedStatusIds.map((statusId: string, index: number) =>
      supabase
        .from('entity_statuses')
        .update({ sort_order: index, updated_by: user.id, updated_at: new Date().toISOString() })
        .eq('id', statusId)
        .eq('workspace_id', workspaceId),
    );

    const results = await Promise.all(updatePromises);
    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      console.error('Errors updating opportunity stage order:', errors.map((e) => e.error));
      throw new Error('Failed to update all opportunity stage orderings');
    }

    return successDataResponse('Opportunity stages reordered successfully', null);
  },
);
