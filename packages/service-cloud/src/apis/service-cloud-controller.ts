'use server';

import { NextResponse } from 'next/server';

import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '../utils/response-handler';
import { assertServiceCloudWorkspaceAccess } from './_shared/workspace-access';

type UniqueResourceField = {
  field: string;
  label: string;
  defaultValue?: string | number | null;
};

const RESOURCE_CONFIG = {
  organizations: {
    table: 'organizations',
    softDelete: true,
    orderBy: 'created_at',
    searchColumns: ['name', 'email', 'website', 'industry'],
  },
  customers: {
    table: 'customers',
    softDelete: true,
    orderBy: 'created_at',
    searchColumns: ['name', 'email', 'phone', 'job_title'],
  },
  'ticket-statuses': {
    table: 'ticket_statuses',
    softDelete: false,
    orderBy: 'display_order',
    searchColumns: ['name', 'status_key'],
    uniqueFields: [{ field: 'display_order', label: 'Order', defaultValue: 0 }],
  },
  'ticket-priorities': {
    table: 'ticket_priorities',
    softDelete: false,
    orderBy: 'severity_order',
    searchColumns: ['name', 'priority_key'],
    uniqueFields: [
      { field: 'severity_order', label: 'Severity', defaultValue: 0 },
    ],
  },
  'ticket-categories': {
    table: 'ticket_categories',
    softDelete: false,
    orderBy: 'display_order',
    searchColumns: ['name', 'category_key'],
    uniqueFields: [{ field: 'display_order', label: 'Order', defaultValue: 0 }],
  },
  tickets: {
    table: 'tickets',
    softDelete: true,
    orderBy: 'created_at',
    searchColumns: ['subject', 'description'],
  },
  'ticket-assignees': {
    table: 'ticket_assignees',
    softDelete: false,
    orderBy: 'created_at',
    searchColumns: ['assignment_role'],
    hasUpdatedBy: false,
  },
  'time-entries': {
    table: 'time_entries',
    softDelete: false,
    orderBy: 'logged_date',
    searchColumns: ['description'],
  },
} as const;

type ResourceKey = keyof typeof RESOURCE_CONFIG;
type ResourceConfig = (typeof RESOURCE_CONFIG)[ResourceKey];

const ALLOWED_RESOURCES = Object.keys(RESOURCE_CONFIG) as ResourceKey[];

function getResourceConfig(resource: string) {
  if (!ALLOWED_RESOURCES.includes(resource as ResourceKey)) return null;
  return RESOURCE_CONFIG[resource as ResourceKey];
}

function cleanPayload(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, value === '' ? null : value]),
  );
}

function getUniqueFields(
  config: ResourceConfig,
): readonly UniqueResourceField[] {
  return 'uniqueFields' in config ? config.uniqueFields : [];
}

async function assertUniqueResourceFields({
  supabase,
  config,
  workspaceId,
  payload,
  currentId,
}: {
  supabase: any;
  config: ResourceConfig;
  workspaceId: string;
  payload: Record<string, any>;
  currentId?: string;
}) {
  for (const uniqueField of getUniqueFields(config)) {
    const hasPayloadValue = Object.prototype.hasOwnProperty.call(
      payload,
      uniqueField.field,
    );

    if (
      !hasPayloadValue &&
      (currentId || uniqueField.defaultValue === undefined)
    ) {
      continue;
    }

    const value = hasPayloadValue
      ? payload[uniqueField.field]
      : uniqueField.defaultValue;

    if (value === undefined || value === null || value === '') continue;

    let query = supabase
      .schema('service_cloud')
      .from(config.table)
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq(uniqueField.field, value)
      .limit(1);

    if (currentId) {
      query = query.neq('id', currentId);
    }

    const { data, error } = await query;
    if (error) throw error;

    if ((data ?? []).length > 0) {
      throw new ApiError(`${uniqueField.label} cannot be repeated`, 409);
    }
  }
}

export const getServiceCloudResourceController = catchAsync(
  async ({ request, params }) => {
    const resource = params?.resource ?? '';
    const config = getResourceConfig(resource);
    if (!config)
      return NextResponse.json(
        { success: false, message: 'Unknown resource' },
        { status: 404 },
      );

    const url = new URL(request.url);
    const workspaceId =
      url.searchParams.get('workspaceId') ??
      url.searchParams.get('workspace_id');
    const id = url.searchParams.get('id');
    const search = url.searchParams.get('search');
    const customerId =
      url.searchParams.get('customerId') ??
      url.searchParams.get('customer_id');
    const assignedToMe = url.searchParams.get('assignedToMe') === 'true';

    if (!workspaceId)
      return NextResponse.json(
        { success: false, message: 'workspaceId is required' },
        { status: 400 },
      );

    const { supabase, user, error } =
      await assertServiceCloudWorkspaceAccess(workspaceId);
    if (error || !user) return error!;

    let query = (supabase as any)
      .schema('service_cloud')
      .from(config.table)
      .select('*')
      .eq('workspace_id', workspaceId);

    if ('softDelete' in config && config.softDelete) {
      query = query.eq('is_deleted', false);
    }

    const createdAtFrom = url.searchParams.get('createdAtFrom');
    const createdAtTo = url.searchParams.get('createdAtTo');
    const updatedAtFrom = url.searchParams.get('updatedAtFrom');
    const updatedAtTo = url.searchParams.get('updatedAtTo');

    if (createdAtFrom) {
      query = query.gte('created_at', `${createdAtFrom}T00:00:00.000Z`);
    }
    if (createdAtTo) {
      query = query.lte('created_at', `${createdAtTo}T23:59:59.999Z`);
    }
    if (updatedAtFrom) {
      query = query.gte('updated_at', `${updatedAtFrom}T00:00:00.000Z`);
    }
    if (updatedAtTo) {
      query = query.lte('updated_at', `${updatedAtTo}T23:59:59.999Z`);
    }

    if (id) {
      const { data, error: fetchError } = await query
        .eq('id', id)
        .maybeSingle();
      if (fetchError) throw fetchError;
      return successDataResponse(`${resource} retrieved successfully`, data);
    }

    if (search && config.searchColumns.length > 0) {
      query = query.or(
        config.searchColumns
          .map((column) => `${column}.ilike.%${search}%`)
          .join(','),
      );
    }

    const createdByIds = url.searchParams.get('createdByIds') || '';
    const statusIds = url.searchParams.get('statusIds') || '';
    const priorityIds = url.searchParams.get('priorityIds') || '';
    const assigneeIds = url.searchParams.get('assigneeIds') || '';

    if (createdByIds && createdByIds !== 'all' && createdByIds !== 'undefined' && createdByIds !== 'null') {
      const ids = createdByIds.split(',').map((id) => id.trim()).filter(Boolean);
      if (ids.length > 0) {
        query = query.in('created_by', ids);
      }
    }

    if (resource === 'tickets' && customerId && customerId !== 'undefined' && customerId !== 'null') {
      query = query.eq('customer_id', customerId);
    }

    if (resource === 'tickets' && assignedToMe) {
      const { data: assignedTickets, error: assignedTicketsError } = await (
        supabase as any
      )
        .schema('service_cloud')
        .from('ticket_assignees')
        .select('ticket_id')
        .eq('workspace_id', workspaceId)
        .eq('account_id', user.id);

      if (assignedTicketsError) throw assignedTicketsError;

      const assignedTicketIds = Array.from(
        new Set(
          (assignedTickets ?? [])
            .map((assignment: any) => assignment.ticket_id)
            .filter(Boolean),
        ),
      );

      if (assignedTicketIds.length === 0) {
        return successDataResponse(`${resource} retrieved successfully`, []);
      }

      query = query.in('id', assignedTicketIds);
    }

    if (resource === 'tickets') {
      if (statusIds && statusIds !== 'all' && statusIds !== 'undefined' && statusIds !== 'null') {
        const ids = statusIds.split(',').map((id) => id.trim()).filter(Boolean);
        if (ids.length > 0) {
          query = query.in('status_id', ids);
        }
      }
      if (priorityIds && priorityIds !== 'all' && priorityIds !== 'undefined' && priorityIds !== 'null') {
        const ids = priorityIds.split(',').map((id) => id.trim()).filter(Boolean);
        if (ids.length > 0) {
          query = query.in('priority_id', ids);
        }
      }
      if (assigneeIds && assigneeIds !== 'all' && assigneeIds !== 'undefined' && assigneeIds !== 'null') {
        const ids = assigneeIds.split(',').map((id) => id.trim()).filter(Boolean);
        if (ids.length > 0) {
          const { data: ticketAssigneeData, error: taError } = await (supabase as any)
            .schema('service_cloud')
            .from('ticket_assignees')
            .select('ticket_id')
            .eq('workspace_id', workspaceId)
            .in('account_id', ids);

          if (taError) throw taError;
          const ticketIds = Array.from(new Set(ticketAssigneeData?.map((ta: any) => ta.ticket_id).filter(Boolean) || []));
          if (ticketIds.length === 0) {
            query = query.in('id', ['00000000-0000-0000-0000-000000000000']);
          } else {
            query = query.in('id', ticketIds);
          }
        }
      }
    }

    const sortColumn = url.searchParams.get('sortColumn');
    const sortDirection = url.searchParams.get('sortDirection');

    let finalSortColumn = sortColumn || config.orderBy;
    const isNodeJsSort = finalSortColumn === 'lifecycle';

    if (isNodeJsSort) {
      finalSortColumn = config.orderBy;
    }

    const isAscending = sortColumn && !isNodeJsSort
      ? sortDirection === 'asc'
      : resource === 'ticket-priorities';

    let { data, error: fetchError } = await query.order(finalSortColumn, {
      ascending: isAscending,
    });

    if (fetchError) throw fetchError;

    if (isNodeJsSort && sortColumn && data) {
      const ascending = sortDirection === 'asc';
      data = [...data].sort((a: any, b: any) => {
        const aVal = String(a[sortColumn] || '').toLowerCase();
        const bVal = String(b[sortColumn] || '').toLowerCase();
        if (aVal < bVal) return ascending ? -1 : 1;
        if (aVal > bVal) return ascending ? 1 : -1;
        return 0;
      });
    }

    if (resource === 'tickets') {
      const tickets = data ?? [];
      const ticketIds = tickets
        .map((ticket: any) => ticket.id)
        .filter(
          (ticketId: unknown): ticketId is string =>
            typeof ticketId === 'string',
        );

      if (ticketIds.length === 0) {
        return successDataResponse(`${resource} retrieved successfully`, []);
      }

      const { data: assignees, error: assigneesError } = await (supabase as any)
        .schema('service_cloud')
        .from('ticket_assignees')
        .select('*')
        .eq('workspace_id', workspaceId)
        .in('ticket_id', ticketIds)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (assigneesError) throw assigneesError;

      const accountIds = Array.from<string>(
        new Set(
          (assignees ?? [])
            .map((assignee: any) => assignee.account_id)
            .filter(
              (accountId: unknown): accountId is string =>
                typeof accountId === 'string',
            ),
        ),
      );
      const { data: accounts, error: accountsError } =
        accountIds.length > 0
          ? await supabase
              .from('accounts')
              .select('id,name,email,picture_url')
              .in('id', accountIds)
          : { data: [], error: null };

      if (accountsError) throw accountsError;

      const accountById = new Map(
        (accounts ?? []).map((account: any) => [account.id, account]),
      );
      const assigneesByTicketId = new Map<string, any[]>();

      (assignees ?? []).forEach((assignee: any) => {
        const ticketAssignees =
          assigneesByTicketId.get(assignee.ticket_id) ?? [];
        ticketAssignees.push({
          ...assignee,
          account: accountById.get(assignee.account_id) ?? null,
        });
        assigneesByTicketId.set(assignee.ticket_id, ticketAssignees);
      });

      return successDataResponse(
        `${resource} retrieved successfully`,
        tickets.map((ticket: any) => ({
          ...ticket,
          assignees: assigneesByTicketId.get(ticket.id) ?? [],
        })),
      );
    }

    return successDataResponse(
      `${resource} retrieved successfully`,
      data ?? [],
    );
  },
);

export const createServiceCloudResourceController = catchAsync(
  async ({ request, params }) => {
    const resource = params?.resource ?? '';
    const config = getResourceConfig(resource);
    if (!config)
      return NextResponse.json(
        { success: false, message: 'Unknown resource' },
        { status: 404 },
      );

    const body = await request.json().catch(() => null);
    const workspaceId = body?.workspace_id ?? body?.workspaceId;

    if (!workspaceId)
      return NextResponse.json(
        { success: false, message: 'workspace_id is required' },
        { status: 400 },
      );

    const { supabase, user, error } =
      await assertServiceCloudWorkspaceAccess(workspaceId);
    if (error || !user) return error!;

    const insertPayload: Record<string, any> = {
      ...body,
      workspace_id: workspaceId,
      created_by: user.id,
    };

    if (!('hasUpdatedBy' in config) || config.hasUpdatedBy !== false) {
      insertPayload.updated_by = user.id;
    }

    const payload = cleanPayload(insertPayload);
    delete (payload as any).workspaceId;

    await assertUniqueResourceFields({
      supabase,
      config,
      workspaceId,
      payload,
    });

    const { data, error: insertError } = await (supabase as any)
      .schema('service_cloud')
      .from(config.table)
      .insert(payload)
      .select('*')
      .single();

    if (insertError) throw insertError;

    return NextResponse.json(
      { success: true, message: `${resource} created successfully`, data },
      { status: 201 },
    );
  },
);

export const updateServiceCloudResourceController = catchAsync(
  async ({ request, params }) => {
    const resource = params?.resource ?? '';
    const config = getResourceConfig(resource);
    if (!config)
      return NextResponse.json(
        { success: false, message: 'Unknown resource' },
        { status: 404 },
      );

    const body = await request.json().catch(() => null);
    const workspaceId = body?.workspace_id ?? body?.workspaceId;

    if (!body?.id || !workspaceId)
      return NextResponse.json(
        { success: false, message: 'id and workspace_id are required' },
        { status: 400 },
      );

    const { supabase, user, error } =
      await assertServiceCloudWorkspaceAccess(workspaceId);
    if (error || !user) return error!;

    const updatePayload: Record<string, any> = {
      ...body,
    };

    if (!('hasUpdatedBy' in config) || config.hasUpdatedBy !== false) {
      updatePayload.updated_by = user.id;
    }

    const payload = cleanPayload(updatePayload);
    delete (payload as any).id;
    delete (payload as any).workspaceId;
    delete (payload as any).workspace_id;

    await assertUniqueResourceFields({
      supabase,
      config,
      workspaceId,
      payload,
      currentId: body.id,
    });

    const { data, error: updateError } = await (supabase as any)
      .schema('service_cloud')
      .from(config.table)
      .update(payload)
      .eq('workspace_id', workspaceId)
      .eq('id', body.id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    if (
      resource === 'tickets' &&
      Object.prototype.hasOwnProperty.call(body, 'assigned_agent_id')
    ) {
      const assignees = (supabase as any)
        .schema('service_cloud')
        .from('ticket_assignees');

      const { error: clearPrimaryError } = await assignees
        .update({ is_primary: false })
        .eq('workspace_id', workspaceId)
        .eq('ticket_id', body.id)
        .eq('is_primary', true);

      if (clearPrimaryError) throw clearPrimaryError;

      if (body.assigned_agent_id) {
        const { error: primaryAssigneeError } = await assignees.upsert(
          {
            workspace_id: workspaceId,
            ticket_id: body.id,
            account_id: body.assigned_agent_id,
            assignment_role: 'owner',
            is_primary: true,
            created_by: user.id,
          },
          { onConflict: 'ticket_id,account_id' },
        );

        if (primaryAssigneeError) throw primaryAssigneeError;
      }
    }

    return successDataResponse(`${resource} updated successfully`, data);
  },
);

export const deleteServiceCloudResourceController = catchAsync(
  async ({ request, params }) => {
    const resource = params?.resource ?? '';
    const config = getResourceConfig(resource);
    if (!config)
      return NextResponse.json(
        { success: false, message: 'Unknown resource' },
        { status: 404 },
      );

    const url = new URL(request.url);
    const workspaceId =
      url.searchParams.get('workspaceId') ??
      url.searchParams.get('workspace_id');
    const id = url.searchParams.get('id');

    if (!id || !workspaceId)
      return NextResponse.json(
        { success: false, message: 'id and workspaceId are required' },
        { status: 400 },
      );

    const { supabase, user, error } =
      await assertServiceCloudWorkspaceAccess(workspaceId);
    if (error || !user) return error!;

    const query = (supabase as any).schema('service_cloud').from(config.table);
    const { error: deleteError } = config.softDelete
      ? await query
          .update({
            is_deleted: true,
            deleted_at: new Date().toISOString(),
            deleted_by: user.id,
          })
          .eq('workspace_id', workspaceId)
          .eq('id', id)
      : await query.delete().eq('workspace_id', workspaceId).eq('id', id);

    if (deleteError) throw deleteError;

    return successDataResponse(`${resource} deleted successfully`, { id });
  },
);

export const getServiceCloudDashboardController = catchAsync(
  async ({ request }) => {
    const url = new URL(request.url);
    const workspaceId =
      url.searchParams.get('workspaceId') ??
      url.searchParams.get('workspace_id');
    if (!workspaceId)
      return NextResponse.json(
        { success: false, message: 'workspaceId is required' },
        { status: 400 },
      );

    const { supabase, user, error } =
      await assertServiceCloudWorkspaceAccess(workspaceId);
    if (error || !user) return error!;

    // Use the optimized RPC function for single database transaction
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { data: dashboardData, error: rpcError } = await (
      supabase as any
    ).rpc('get_service_cloud_dashboard_stats' as any, {
      p_workspace_id: workspaceId,
    });
    /* eslint-enable @typescript-eslint/no-explicit-any */

    if (rpcError) {
      console.error('[ServiceCloud Dashboard] RPC error:', rpcError);
      throw rpcError;
    }

    return successDataResponse(
      'Service Cloud dashboard retrieved successfully',
      dashboardData,
    );
  },
);

/**
 * GET /api/service-cloud/ticket-lookups
 * Optimized: fetches ticket statuses, priorities, and categories in a single API call
 * using Promise.all on the server side, replacing 3 separate HTTP round-trips with 1.
 */
export const getServiceCloudTicketLookupsController = catchAsync(
  async ({ request }) => {
    const url = new URL(request.url);
    const workspaceId =
      url.searchParams.get('workspaceId') ??
      url.searchParams.get('workspace_id');
    if (!workspaceId)
      return NextResponse.json(
        { success: false, message: 'workspaceId is required' },
        { status: 400 },
      );

    const { supabase, user, error } =
      await assertServiceCloudWorkspaceAccess(workspaceId);
    if (error || !user) return error!;

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const client = (supabase as any).schema('service_cloud');

    const [statuses, priorities, categories] = await Promise.all([
      client
        .from('ticket_statuses')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
      client
        .from('ticket_priorities')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .order('severity_order', { ascending: true }),
      client
        .from('ticket_categories')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
    ]);
    /* eslint-enable @typescript-eslint/no-explicit-any */

    if (statuses.error) throw statuses.error;
    if (priorities.error) throw priorities.error;
    if (categories.error) throw categories.error;

    return successDataResponse('Ticket lookups retrieved successfully', {
      statuses: statuses.data ?? [],
      priorities: priorities.data ?? [],
      categories: categories.data ?? [],
    });
  },
);
