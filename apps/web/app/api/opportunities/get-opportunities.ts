import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import type { Database } from '~/lib/database.types';

import { catchAsync } from '../../../utils/response-handler';

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
    if (
      !isOwner &&
      hierarchyType === 'restricted' &&
      visibleUserIds &&
      visibleUserIds.length > 0
    ) {
      const { data: assignments } = await (adminClient as any)
        .from('opportunity_assignees')
        .select('opportunity_id')
        .eq('workspace_id', workspaceId)
        .eq('assigned_to_user_id', user.id)
        .eq('assignment_status', 'active');

      assignedOpportunityIds =
        assignments?.map((a: any) => a.opportunity_id) || [];
    }

    const { OpportunitiesService } = await import('@kit/sales');
    const opportunitiesService = new OpportunitiesService(adminClient as any);

    const {
      data: sortedOpportunities,
      count,
      totalAmount,
      stageBreakdownMap: stageBreakdown,
    } = await opportunitiesService.getOpportunitiesList({
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
