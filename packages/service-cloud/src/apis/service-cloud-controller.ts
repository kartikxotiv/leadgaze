'use server';

import { NextResponse } from 'next/server';

import { catchAsync, successDataResponse } from '../utils/response-handler';
import { assertServiceCloudWorkspaceAccess } from './_shared/workspace-access';

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
  },
  'ticket-priorities': {
    table: 'ticket_priorities',
    softDelete: false,
    orderBy: 'severity_order',
    searchColumns: ['name', 'priority_key'],
  },
  'ticket-categories': {
    table: 'ticket_categories',
    softDelete: false,
    orderBy: 'display_order',
    searchColumns: ['name', 'category_key'],
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

    const { data, error: fetchError } = await query.order(config.orderBy, {
      ascending: resource === 'ticket-priorities',
    });

    if (fetchError) throw fetchError;

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
