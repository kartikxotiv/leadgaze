import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import type { Database } from '~/lib/database.types';

import {
  filterLeadsForRead,
  loadFieldPermissionContext,
} from '../../../lib/field-permission';
import { catchAsync } from '../../../utils/response-handler';

// Direct columns: sorted at DB level via .order()
const LEAD_DIRECT_SORT_COLUMNS: Record<string, string> = {
  first_name: 'first_name',
  last_name: 'last_name',
  email: 'email',
  alt_email: 'alt_email',
  company_name: 'company_name',
  job_title: 'job_title',
  department: 'department',
  location: 'location',
  trigger: 'trigger',
  created_at: 'created_at',
};

// Relational columns: sorted in Node.js after fetch because Supabase's
// foreignTable in .order() only sorts nested rows, NOT the parent rows.
// The accessor is a dot-path into the fetched lead object.
const LEAD_RELATIONAL_SORT_COLUMNS: Record<string, string> = {
  'status.status_name': 'status.status_name',
  'source.source_name': 'source.source_name',
  'industry.industry_name': 'industry.industry_name',
  'created_by_account.name': 'created_by_account.name',
  'updated_by_account.name': 'updated_by_account.name',
  company_size: 'company_size',
};

/**
 * GET /api/leads
 * Fetch all leads for a workspace
 * Optimized: uses resolve_workspace_access RPC (1 DB call) instead of 5-8 sequential auth/hierarchy queries.
 * Name-search pre-query results are cached and reused for breakdown. Main + breakdown run in Promise.all.
 */
const getLeads = catchAsync(
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
    const statusId = url.searchParams.get('statusId') || '';
    const debug = url.searchParams.get('debug') === '1';
    const sortColumn = url.searchParams.get('sortColumn') || '';
    const sortDirection = url.searchParams.get('sortDirection') || '';
    const createdAtFrom = url.searchParams.get('createdAtFrom') || '';
    const createdAtTo = url.searchParams.get('createdAtTo') || '';
    const updatedAtFrom = url.searchParams.get('updatedAtFrom') || '';
    const updatedAtTo = url.searchParams.get('updatedAtTo') || '';

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

    // Single RPC call replaces: accounts lookup, workspace owner check, membership check,
    // and 3-5 queries inside getHierarchyVisibleUserIds
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { data: accessResult, error: accessError } = await (
      adminClient as any
    ).rpc('resolve_workspace_access', {
      p_workspace_id: workspaceId,
      p_user_id: user.id,
      p_user_email: user.email || null,
      p_require_shared_team: false, // leads use requireSharedTeam: false
    });

    /* eslint-enable @typescript-eslint/no-explicit-any */

    if (accessError) {
      console.error('Workspace access resolution error:', accessError);
      throw accessError;
    }

    const {
      actor_account_id: actorAccountId,
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
    let assignedLeadIds: string[] = [];

    if (
      !isOwner &&
      hierarchyType === 'restricted' &&
      visibleUserIds &&
      visibleUserIds.length > 0
    ) {
      // Fetch leads assigned to the current user or any lower hierarchy user.
      const { data: assignments } = await adminClient
        .from('lead_assignees')
        .select('lead_id')
        .eq('workspace_id', workspaceId)
        .in('assigned_to_user_id', visibleUserIds)
        .eq('assignment_status', 'active');

      assignedLeadIds =
        assignments?.map((a: { lead_id: string }) => a.lead_id) || [];
    }

    // Instantiate LeadsService from the new @kit/sales package
    const { LeadsService } = await import('@kit/sales');
    const leadsService = new LeadsService(adminClient);

    const sortDir = sortDirection === 'asc' ? 'asc' : 'desc';

    // Execute list query and breakdown query concurrently using the service
    const [mainResult, breakdownData] = await Promise.all([
      leadsService.getLeadsList({
        workspaceId,
        page,
        limit,
        searchTerm,
        statusId: statusId && statusId !== 'all' ? statusId : undefined,
        sortColumn:
          LEAD_DIRECT_SORT_COLUMNS[sortColumn] ||
          LEAD_RELATIONAL_SORT_COLUMNS[sortColumn] ||
          'created_at',
        sortDirection: sortDir,
        createdAtFrom,
        createdAtTo,
        updatedAtFrom,
        updatedAtTo,
        isOwner,
        visibleUserIds: visibleUserIds || [],
        assignedLeadIds,
      }),
      leadsService.getLeadsBreakdown({
        workspaceId,
        searchTerm,
        createdAtFrom,
        createdAtTo,
        updatedAtFrom,
        updatedAtTo,
        isOwner,
        visibleUserIds: visibleUserIds || [],
        assignedLeadIds,
      }),
    ]);

    const { data: leadsRaw, count } = mainResult;

    const statusBreakdownMap: Record<string, { count: number }> = {};
    (
      (breakdownData || []) as Array<{ status_id: string; count: number }>
    ).forEach((item) => {
      statusBreakdownMap[item.status_id] = { count: item.count };
    });

    const fieldCtx = await loadFieldPermissionContext(supabase, {
      workspaceId,
      entityType: 'leads',
      productKey: 'sales',
      userId: user.id,
      moduleKey: 'leads',
    });

    // We no longer sort in Node.js because LeadsService uses a view that supports relational sorting and pagination at DB layer
    const sortedLeads = leadsRaw || [];

    const filteredLeads = filterLeadsForRead(sortedLeads, fieldCtx);

    return NextResponse.json({
      message: 'Leads retrieved successfully',
      data: filteredLeads,
      count: count || 0,
      statusBreakdown: statusBreakdownMap,
      ...(debug
        ? {
            debug: {
              workspaceId,
              userId: user.id,
              actorAccountId,
              isOwner,
              hasAllHierarchyAccess: hierarchyType === 'all',
              visibleUserIds: visibleUserIds || [],
            },
          }
        : {}),
    });
  },
);

/**
 * POST /api/leads
 * Create a new lead
 */

export { getLeads };
