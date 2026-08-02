import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { Database } from '@kit/supabase/database';
import {
  filterLeadForRead,
  filterLeadsForRead,
  loadFieldPermissionContext,
  validateLeadWritePayload,
} from '../../../lib/field-permission';
import {
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';

// Direct columns: sorted at DB level via .order()
const LEAD_DIRECT_SORT_COLUMNS: Record<string, string> = {
  first_name:   'first_name',
  last_name:    'last_name',
  email:        'email',
  alt_email:    'alt_email',
  company_name: 'company_name',
  job_title:    'job_title',
  department:   'department',
  location:     'location',
  trigger:      'trigger',
  created_at:   'created_at',
};

// Relational columns: sorted in Node.js after fetch because Supabase's
// foreignTable in .order() only sorts nested rows, NOT the parent rows.
// The accessor is a dot-path into the fetched lead object.
const LEAD_RELATIONAL_SORT_COLUMNS: Record<string, string> = {
  'status.status_name':      'status.status_name',
  'source.source_name':      'source.source_name',
  'industry.industry_name':  'industry.industry_name',
  'created_by_account.name': 'created_by_account.name',
  'updated_by_account.name': 'updated_by_account.name',
  'company_size': 'company_size',
};

// Helper to read a dot-path value from an object
const getNestedValue = (obj: Record<string, unknown>, path: string): string => {
  const value = path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
  return typeof value === 'string' ? value.toLowerCase() : '';
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

    // Pre-compute name-search matched IDs once (was running twice: for main + breakdown)
    let nameMatchedIds: string[] = [];
    if (searchTerm) {
      const parts = searchTerm.split(' ').filter(Boolean);
      if (parts.length >= 2) {
        const part1 = parts[0];
        const part2 = parts[1];
        const { data: nameMatched } = await adminClient
          .from('crm_leads')
          .select('id')
          .eq('workspace_id', workspaceId)
          .or(
            `and(first_name.ilike.%${part1}%,last_name.ilike.%${part2}%),and(first_name.ilike.%${part2}%,last_name.ilike.%${part1}%)`,
          );
        nameMatchedIds = nameMatched?.map((l: { id: string }) => l.id) || [];
      }
    }

    // Helper to build the common search filter string
    const buildSearchOrFilter = () => {
      let orFilter = `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%,mobile_number.ilike.%${searchTerm}%`;
      if (nameMatchedIds.length > 0) {
        orFilter += `,id.in.(${nameMatchedIds.join(',')})`;
      }
      return orFilter;
    };

    // Helper to apply hierarchy + assignee filter to a query
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const applyAccessFilter = (q: any) => {
      if (!isOwner && visibleUserIds && visibleUserIds.length > 0) {
        const assignedIdsFilter =
          assignedLeadIds.length > 0
            ? `,id.in.(${assignedLeadIds.join(',')})`
            : '';
        q = q.or(
          `owner_id.in.(${visibleUserIds.join(',')}),created_by.in.(${visibleUserIds.join(',')})${assignedIdsFilter}`,
        );
      }
      return q;
    };
    /* eslint-enable @typescript-eslint/no-explicit-any */

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
        sortColumn: LEAD_DIRECT_SORT_COLUMNS[sortColumn] || LEAD_RELATIONAL_SORT_COLUMNS[sortColumn] || 'created_at',
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
      })
    ]);

    const { data: leadsRaw, count } = mainResult;

    const statusBreakdownMap: Record<string, { count: number }> = {};
    (breakdownData || []).forEach((item: { status_id: string, count: number }) => {
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
    let sortedLeads = leadsRaw || [];

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
const createLead = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const body = await request.json();

    const {
      workspace_id,
      first_name,
      last_name,
      email,
      alt_email,
      phone_number,
      mobile_number,
      linkedin_url,
      company_name,
      company_website,
      company_linkedin_url,
      job_title,
      department,
      industry_id,
      company_size,
      annual_revenue,
      location,
      timezone,
      status_id,
      source_id,
      trigger,
      lead_score,
      owner_id,
      notes,
      tags,
      custom_fields,
    } = body;

    // Validation
    if (!workspace_id || !first_name || !status_id) {
      return NextResponse.json(
        { message: 'workspace_id, first_name, and status_id are required' },
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

    const fieldCtx = await loadFieldPermissionContext(supabase, {
      workspaceId: workspace_id,
      entityType: 'leads',
      productKey: 'sales',
      userId: user.id,
      moduleKey: 'leads',
    });

    const { sanitized, rejected } = validateLeadWritePayload(
      {
        first_name,
        last_name,
        email,
        alt_email,
        phone_number,
        mobile_number,
        linkedin_url,
        company_name,
        company_website,
        company_linkedin_url,
        job_title,
        department,
        industry_id,
        company_size,
        annual_revenue,
        location,
        timezone,
        status_id,
        source_id,
        trigger,
        lead_score,
        owner_id,
        notes,
        tags,
        custom_fields,
      },
      fieldCtx,
    );

    if (rejected.length > 0) {
      return NextResponse.json(
        {
          message: 'You do not have permission to set some fields',
          rejectedFields: rejected,
        },
        { status: 403 },
      );
    }

    if (!sanitized.first_name || !sanitized.status_id) {
      return NextResponse.json(
        { message: 'first_name and status_id are required' },
        { status: 400 },
      );
    }

    // Create lead
    const { data: lead, error } = await supabase
      .from('crm_leads')
      .insert({
        workspace_id,
        first_name: sanitized.first_name as string,
        last_name: (sanitized.last_name as string) || null,
        email: (sanitized.email as string) || null,
        alt_email: (sanitized.alt_email as string) || null,
        phone_number: (sanitized.phone_number as string) || null,
        mobile_number: (sanitized.mobile_number as string) || null,
        linkedin_url: (sanitized.linkedin_url as string) || null,
        company_name: (sanitized.company_name as string) || null,
        company_website: (sanitized.company_website as string) || null,
        company_linkedin_url: (sanitized.company_linkedin_url as string) || null,
        job_title: (sanitized.job_title as string) || null,
        department: (sanitized.department as string) || null,
        industry_id: (sanitized.industry_id as string) || null,
        company_size: (sanitized.company_size as Database['public']['Tables']['crm_leads']['Insert']['company_size']) || null,
        annual_revenue: (sanitized.annual_revenue as number) || null,
        location: (sanitized.location as string) || null,
        timezone: (sanitized.timezone as string) || null,
        status_id: sanitized.status_id as string,
        source_id: (sanitized.source_id as string) || null,
        trigger: (sanitized.trigger as string) || null,
        lead_score: (sanitized.lead_score as number) || 0,
        owner_id: (sanitized.owner_id as string) || null,
        notes: (sanitized.notes as string) || null,
        tags: (sanitized.tags as string[]) || [],
        custom_fields: ((sanitized.custom_fields as Record<string, unknown>) || {}) as Database['public']['Tables']['crm_leads']['Insert']['custom_fields'],
        created_by: user.id,
      })
      .select(
        `
        *,
        company_website,
        company_linkedin_url,
        status:entity_statuses(id, status_name, status_key, color, icon),
        source:lead_sources(id, source_name, source_key, color, icon),
        owner:accounts!crm_leads_owner_id_fkey(id, email, name),
        created_by_account:accounts!crm_leads_created_by_fkey(id, email, name),
        industry:crm_industries(id, industry_name)
      `,
      )
      .single();

    if (error) {
      console.error('Create lead error:', error);
      throw error;
    }

    return NextResponse.json(
      {
        message: 'Lead created successfully',
        data: filterLeadForRead(lead, fieldCtx),
      },
      { status: 201 },
    );
  },
);

/**
 * GET /api/leads/meta/sources
 * Fetch all lead sources for a workspace
 */
const getLeadSources = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
        { status: 400 },
      );
    }

    const { data: sources, error } = await supabase
      .from('lead_sources')
      .select('id, source_name, source_key, color, icon')
      .eq('workspace_id', workspaceId)
      .order('source_name', { ascending: true });

    if (error) {
      console.error('Get sources error:', error);
      throw error;
    }

    return successDataResponse('Sources retrieved successfully', sources || []);
  },
);

/**
 * GET /api/leads/statuses
 * Fetch all lead statuses for a workspace
 * Supports ?includeInactive=true to return all statuses (for management dialog)
 */
const getLeadStatuses = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
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

    const { data: module, error: moduleError } = await supabase
      .from('crm_modules')
      .select('id')
      .eq('module_key', 'leads')
      .single();

    if (moduleError || !module) {
      console.error('Get module error:', moduleError);
      return NextResponse.json(
        { message: 'Failed to retrieve module information' },
        { status: 500 },
      );
    }

    let query = supabase
      .from('entity_statuses')
      .select('id, status_name, status_key, color, icon, is_closed, is_active, is_system, is_default, sort_order')
      .eq('workspace_id', workspaceId)
      .eq('module_id', module.id)
      .order('sort_order', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data: statuses, error } = await query;

    if (error) {
      console.error('Get statuses error:', error);
      throw error;
    }

    return successDataResponse(
      'Statuses retrieved successfully',
      statuses || [],
    );
  },
);

/**
 * GET /api/leads/statuses/[id]/affected
 * Get count + first N leads using this status (for pre-disable confirmation modal)
 */
const getAffectedLeads = catchAsync(
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
    const statusId = params?.id;

    if (!workspaceId || !statusId) {
      return NextResponse.json(
        { message: 'workspaceId and status id are required' },
        { status: 400 },
      );
    }

    const { data: records, error, count } = await adminClient
      .from('crm_leads')
      .select('id, first_name, last_name, email', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .eq('status_id', statusId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Get affected leads error:', error);
      throw error;
    }

    const mapped = (records || []).map((r: any) => ({
      id: r.id,
      name: [r.first_name, r.last_name].filter(Boolean).join(' '),
      email: r.email || null,
    }));

    return successDataResponse('Affected leads retrieved successfully', {
      total_count: count ?? 0,
      records: mapped,
    });
  },
);

/**
 * PATCH /api/leads/statuses/[id]/reassign
 * Bulk-reassign all leads from old status to new status, then disable old status.
 * Body: { new_status_id: string, workspace_id: string }
 */
const reassignLeadStatus = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const adminClient = getSupabaseServerAdminClient<Database>();
    const oldStatusId = params?.id;
    const body = await request.json();
    const { new_status_id, workspace_id } = body;

    if (!oldStatusId || !new_status_id || !workspace_id) {
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

    // Validate new status is active and belongs to the same workspace
    const { data: newStatus } = await adminClient
      .from('entity_statuses')
      .select('id, is_active')
      .eq('id', new_status_id)
      .eq('workspace_id', workspace_id)
      .eq('is_active', true)
      .single();

    if (!newStatus) {
      return NextResponse.json(
        { message: 'New status not found or is not active' },
        { status: 400 },
      );
    }

    // Bulk update all affected leads
    const { count: reassignedCount, error: updateError } = await adminClient
      .from('crm_leads')
      .update({ status_id: new_status_id, updated_by: user.id, updated_at: new Date().toISOString() })
      .eq('workspace_id', workspace_id)
      .eq('status_id', oldStatusId)
      .eq('is_deleted', false);

    if (updateError) {
      console.error('Reassign leads error:', updateError);
      throw updateError;
    }

    // Now disable the old status
    const { error: disableError } = await adminClient
      .from('entity_statuses')
      .update({ is_active: false, updated_by: user.id, updated_at: new Date().toISOString() })
      .eq('id', oldStatusId);

    if (disableError) {
      console.error('Disable status error:', disableError);
      throw disableError;
    }

    return successDataResponse('Leads reassigned and status disabled successfully', {
      reassigned_count: reassignedCount ?? 0,
      disabled_status_id: oldStatusId,
    });
  },
);

/**
 * POST /api/leads/sources
 * Create a new lead source
 */
const createLeadSource = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const body = await request.json();
    const { workspace_id, source_name } = body;

    if (!workspace_id || !source_name) {
      return NextResponse.json(
        { message: 'workspace_id and source_name are required' },
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

    // Generate source_key from source_name (lowercase, replace spaces with underscores)
    const source_key = source_name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    // Check if source already exists
    const { data: existing } = await supabase
      .from('lead_sources')
      .select('id')
      .eq('workspace_id', workspace_id)
      .eq('source_key', source_key)
      .single();

    if (existing) {
      return NextResponse.json(
        { message: 'Lead source already exists' },
        { status: 409 },
      );
    }

    // Get the highest sort_order for this workspace
    const { data: maxSort } = await supabase
      .from('lead_sources')
      .select('sort_order')
      .eq('workspace_id', workspace_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const sort_order = (maxSort?.sort_order ?? -1) + 1;

    const { data: source, error } = await supabase
      .from('lead_sources')
      .insert({
        workspace_id,
        source_name: source_name.trim(),
        source_key,
        is_active: true,
        is_system: false,
        sort_order,
        created_by: user.id,
      })
      .select('id, source_name, source_key, color, icon')
      .single();

    if (error) {
      console.error('Create lead source error:', error);
      throw error;
    }

    return successDataResponse('Lead source created successfully', source);
  },
);

/**
 * POST /api/leads/statuses
 * Create a new lead status
 */
const createLeadStatus = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
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
      .eq('module_key', 'leads')
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

    // Get highest sort_order
    const { data: maxSort } = await supabase
      .from('entity_statuses')
      .select('sort_order')
      .eq('workspace_id', workspace_id)
      .eq('module_id', moduleData.id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const sort_order = (maxSort?.sort_order ?? -1) + 1;

    const { data: statusRecord, error } = await supabase
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
      console.error('Create status error:', error);
      throw error;
    }

    return successDataResponse('Status created successfully', statusRecord);
  },
);

/**
 * PATCH /api/leads/statuses/[id]
 * Update a lead status
 */
const updateLeadStatus = catchAsync(
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
        { message: 'status id is required' },
        { status: 400 },
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

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

    const { data: statusRecord, error } = await supabase
      .from('entity_statuses')
      .update(updateData)
      .eq('id', id)
      .select('id, status_name, status_key, color, icon, is_closed')
      .single();

    if (error) {
      console.error('Update status error:', error);
      throw error;
    }

    return successDataResponse('Status updated successfully', statusRecord);
  },
);

/**
 * DELETE /api/leads/statuses/[id]
 * Delete a lead status
 */
const deleteLeadStatus = catchAsync(
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
        { message: 'status id is required' },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from('entity_statuses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete status error:', error);
      throw error;
    }

    return successDataResponse('Status deleted successfully', { id });
  },
);

export {
  getLeads,
  createLead,
  getLeadSources,
  getLeadStatuses,
  getAffectedLeads,
  reassignLeadStatus,
  createLeadSource,
  createLeadStatus,
  updateLeadStatus,
  deleteLeadStatus,
};
