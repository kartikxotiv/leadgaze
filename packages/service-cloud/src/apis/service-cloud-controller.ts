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
  teams: {
    table: 'teams',
    softDelete: false,
    orderBy: 'created_at',
    searchColumns: ['name', 'email_alias'],
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
      .map(([key, value]) => [key, value === '' ? null : value])
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

    const client = (supabase as any).schema('service_cloud');
    const [
      tickets,
      openTickets,
      customers,
      organizations,
      timeEntries,
      recentTickets,
      reportTickets,
      statuses,
      priorities,
      teams,
    ] = await Promise.all([
      client
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('is_deleted', false),
      client
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('is_deleted', false)
        .is('closed_at', null),
      client
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('is_deleted', false),
      client
        .from('organizations')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('is_deleted', false),
      client
        .from('time_entries')
        .select('id, ticket_id, account_id, duration_seconds, logged_date')
        .eq('workspace_id', workspaceId),
      client
        .from('tickets')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(8),
      client
        .from('tickets')
        .select(
          `
          *,
          status:ticket_statuses(id, name, lifecycle, color),
          priority:ticket_priorities(id, name, color, severity_order),
          category:ticket_categories(id, name),
          customer:customers(id, name, email),
          organization:organizations(id, name),
          assigned_team:teams(id, name)
        `,
        )
        .eq('workspace_id', workspaceId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false }),
      client
        .from('ticket_statuses')
        .select('id, name, lifecycle, color, display_order')
        .eq('workspace_id', workspaceId)
        .order('display_order', { ascending: true }),
      client
        .from('ticket_priorities')
        .select('id, name, color, severity_order')
        .eq('workspace_id', workspaceId)
        .order('severity_order', { ascending: true }),
      client
        .from('teams')
        .select('id, name')
        .eq('workspace_id', workspaceId)
        .order('name', { ascending: true }),
    ]);

    const totalLoggedSeconds = (timeEntries.data ?? []).reduce(
      (sum: number, entry: { duration_seconds?: number }) =>
        sum + Number(entry.duration_seconds ?? 0),
      0,
    );
    const reportRows: any[] = reportTickets.data ?? [];
    const statusRows: any[] = statuses.data ?? [];
    const priorityRows: any[] = priorities.data ?? [];
    const teamRows: any[] = teams.data ?? [];
    const timeRows: any[] = timeEntries.data ?? [];
    const ticketById = new Map<string, any>(
      reportRows.map((ticket: any) => [ticket.id, ticket]),
    );
    const accountIds = Array.from(
      new Set(
        [
          ...reportRows.map((ticket: any) => ticket.assigned_agent_id),
          ...timeRows.map((entry: any) => entry.account_id),
        ].filter(Boolean),
      ),
    );
    const { data: accounts, error: accountsError } =
      accountIds.length > 0
        ? await supabase
            .from('accounts')
            .select('id, name, email')
            .in('id', accountIds)
        : { data: [], error: null };

    if (accountsError) throw accountsError;

    const accountById = new Map(
      (accounts ?? []).map((account: any) => [account.id, account]),
    );
    const isOpenTicket = (ticket: any) =>
      !ticket.closed_at &&
      ticket.status?.lifecycle !== 'resolved' &&
      ticket.status?.lifecycle !== 'closed';
    const dateValue = (value?: string | null) =>
      value ? new Date(value).getTime() : 0;
    const labelAccount = (accountId?: string | null) => {
      const account = accountId ? accountById.get(accountId) : null;
      return account?.name || account?.email || 'Unassigned';
    };

    const statusBreakdown = statusRows.map((status: any) => {
      const matching = reportRows.filter(
        (ticket: any) => ticket.status_id === status.id,
      );
      return {
        id: status.id,
        name: status.name,
        lifecycle: status.lifecycle,
        color: status.color,
        count: matching.length,
        loggedSeconds: matching.reduce(
          (sum: number, ticket: any) =>
            sum + Number(ticket.total_logged_seconds ?? 0),
          0,
        ),
      };
    });

    const statusIds = new Set(statusRows.map((status: any) => status.id));
    const unknownStatusCount = reportRows.filter(
      (ticket: any) => !statusIds.has(ticket.status_id),
    ).length;
    if (unknownStatusCount > 0) {
      statusBreakdown.push({
        id: 'unknown',
        name: 'Unknown',
        lifecycle: 'open',
        color: null,
        count: unknownStatusCount,
        loggedSeconds: 0,
      });
    }

    const priorityBreakdown = [
      ...priorityRows.map((priority: any) => {
        const matching = reportRows.filter(
          (ticket: any) => ticket.priority_id === priority.id,
        );
        return {
          id: priority.id,
          name: priority.name,
          color: priority.color,
          count: matching.length,
          openCount: matching.filter(isOpenTicket).length,
        };
      }),
      {
        id: 'none',
        name: 'No Priority',
        color: null,
        count: reportRows.filter((ticket: any) => !ticket.priority_id).length,
        openCount: reportRows.filter(
          (ticket: any) => !ticket.priority_id && isOpenTicket(ticket),
        ).length,
      },
    ].filter((item) => item.count > 0);

    const customerMap = new Map<string, any>();
    reportRows.forEach((ticket: any) => {
      const key = ticket.customer_id ?? 'unassigned';
      const existing = customerMap.get(key) ?? {
        id: key,
        name: ticket.customer?.name ?? 'Unlinked customer',
        email: ticket.customer?.email ?? null,
        organization: ticket.organization?.name ?? null,
        totalTickets: 0,
        openTickets: 0,
        closedTickets: 0,
        loggedSeconds: 0,
        latestTicketAt: null,
      };

      existing.totalTickets += 1;
      existing.openTickets += isOpenTicket(ticket) ? 1 : 0;
      existing.closedTickets += isOpenTicket(ticket) ? 0 : 1;
      existing.loggedSeconds += Number(ticket.total_logged_seconds ?? 0);
      existing.latestTicketAt =
        dateValue(ticket.created_at) > dateValue(existing.latestTicketAt)
          ? ticket.created_at
          : existing.latestTicketAt;
      customerMap.set(key, existing);
    });

    const customerBreakdown = Array.from(customerMap.values()).sort(
      (left: any, right: any) =>
        right.openTickets - left.openTickets ||
        right.totalTickets - left.totalTickets,
    );

    const ticketTimeBreakdown = reportRows
      .map((ticket: any) => ({
        id: ticket.id,
        ticketNumber: ticket.ticket_number,
        subject: ticket.subject,
        status: ticket.status?.name ?? 'Unknown',
        priority: ticket.priority?.name ?? 'None',
        customer: ticket.customer?.name ?? 'Unlinked customer',
        assignee: labelAccount(ticket.assigned_agent_id),
        loggedSeconds: Number(ticket.total_logged_seconds ?? 0),
        emailCount: Number(ticket.email_count ?? 0),
        createdAt: ticket.created_at,
      }))
      .sort((left, right) => right.loggedSeconds - left.loggedSeconds)
      .slice(0, 12);

    const assigneeMap = new Map<string, any>();
    reportRows.forEach((ticket: any) => {
      const key = ticket.assigned_agent_id ?? 'unassigned';
      const existing = assigneeMap.get(key) ?? {
        id: key,
        name: labelAccount(ticket.assigned_agent_id),
        totalTickets: 0,
        openTickets: 0,
        ticketLoggedSeconds: 0,
        actualLoggedSeconds: 0,
      };
      existing.totalTickets += 1;
      existing.openTickets += isOpenTicket(ticket) ? 1 : 0;
      existing.ticketLoggedSeconds += Number(ticket.total_logged_seconds ?? 0);
      assigneeMap.set(key, existing);
    });
    timeRows.forEach((entry: any) => {
      const key = entry.account_id ?? 'unassigned';
      const existing = assigneeMap.get(key) ?? {
        id: key,
        name: labelAccount(entry.account_id),
        totalTickets: 0,
        openTickets: 0,
        ticketLoggedSeconds: 0,
        actualLoggedSeconds: 0,
      };
      existing.actualLoggedSeconds += Number(entry.duration_seconds ?? 0);
      assigneeMap.set(key, existing);
    });

    const assigneeWorkload = Array.from(assigneeMap.values()).sort(
      (left: any, right: any) =>
        right.openTickets - left.openTickets ||
        right.actualLoggedSeconds - left.actualLoggedSeconds,
    );

    const teamBreakdown = [
      ...teamRows.map((team: any) => {
        const matching = reportRows.filter(
          (ticket: any) => ticket.assigned_team_id === team.id,
        );
        return {
          id: team.id,
          name: team.name,
          totalTickets: matching.length,
          openTickets: matching.filter(isOpenTicket).length,
          loggedSeconds: matching.reduce(
            (sum: number, ticket: any) =>
              sum + Number(ticket.total_logged_seconds ?? 0),
            0,
          ),
        };
      }),
      {
        id: 'unassigned',
        name: 'No team',
        totalTickets: reportRows.filter(
          (ticket: any) => !ticket.assigned_team_id,
        ).length,
        openTickets: reportRows.filter(
          (ticket: any) => !ticket.assigned_team_id && isOpenTicket(ticket),
        ).length,
        loggedSeconds: reportRows
          .filter((ticket: any) => !ticket.assigned_team_id)
          .reduce(
            (sum: number, ticket: any) =>
              sum + Number(ticket.total_logged_seconds ?? 0),
            0,
          ),
      },
    ].filter((item) => item.totalTickets > 0);

    const openTicketAging = reportRows
      .filter(isOpenTicket)
      .map((ticket: any) => ({
        id: ticket.id,
        ticketNumber: ticket.ticket_number,
        subject: ticket.subject,
        status: ticket.status?.name ?? 'Unknown',
        customer: ticket.customer?.name ?? 'Unlinked customer',
        assignee: labelAccount(ticket.assigned_agent_id),
        daysOpen: Math.max(
          0,
          Math.floor((Date.now() - dateValue(ticket.created_at)) / 86_400_000),
        ),
        dueDate: ticket.due_date ?? ticket.due_at ?? null,
        loggedSeconds: Number(ticket.total_logged_seconds ?? 0),
      }))
      .sort((left, right) => right.daysOpen - left.daysOpen)
      .slice(0, 12);

    const timeByTicketId = new Map<string, any>();
    timeRows.forEach((entry: any) => {
      const ticket = ticketById.get(entry.ticket_id);
      const existing = timeByTicketId.get(entry.ticket_id) ?? {
        id: entry.ticket_id,
        ticketNumber: ticket?.ticket_number ?? '-',
        subject: ticket?.subject ?? 'Unknown ticket',
        customer: ticket?.customer?.name ?? 'Unlinked customer',
        entries: 0,
        loggedSeconds: 0,
        latestLoggedDate: null,
      };
      existing.entries += 1;
      existing.loggedSeconds += Number(entry.duration_seconds ?? 0);
      existing.latestLoggedDate =
        dateValue(entry.logged_date) > dateValue(existing.latestLoggedDate)
          ? entry.logged_date
          : existing.latestLoggedDate;
      timeByTicketId.set(entry.ticket_id, existing);
    });

    const timeByTicket = Array.from(timeByTicketId.values())
      .sort((left, right) => right.loggedSeconds - left.loggedSeconds)
      .slice(0, 12);

    return successDataResponse(
      'Service Cloud dashboard retrieved successfully',
      {
        totalTickets: tickets.count ?? 0,
        openTickets: openTickets.count ?? 0,
        customers: customers.count ?? 0,
        organizations: organizations.count ?? 0,
        totalLoggedSeconds,
        recentTickets: recentTickets.data ?? [],
        reports: {
          statusBreakdown,
          priorityBreakdown,
          customerBreakdown,
          ticketTimeBreakdown,
          assigneeWorkload,
          teamBreakdown,
          openTicketAging,
          timeByTicket,
        },
      },
    );
  },
);
