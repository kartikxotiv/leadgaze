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
    Object.entries(payload).filter(([, value]) => value !== undefined),
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

    const { data, error: fetchError } = await query.order(config.orderBy, {
      ascending: resource === 'ticket-priorities',
    });

    if (fetchError) throw fetchError;

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

    const payload = cleanPayload({
      ...body,
      workspace_id: workspaceId,
      created_by: user.id,
      updated_by: user.id,
    });
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

    const payload = cleanPayload({
      ...body,
      updated_by: user.id,
    });
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
        .select('duration_seconds')
        .eq('workspace_id', workspaceId),
      client
        .from('tickets')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(8),
    ]);

    const totalLoggedSeconds = (timeEntries.data ?? []).reduce(
      (sum: number, entry: { duration_seconds?: number }) =>
        sum + Number(entry.duration_seconds ?? 0),
      0,
    );

    return successDataResponse(
      'Service Cloud dashboard retrieved successfully',
      {
        totalTickets: tickets.count ?? 0,
        openTickets: openTickets.count ?? 0,
        customers: customers.count ?? 0,
        organizations: organizations.count ?? 0,
        totalLoggedSeconds,
        recentTickets: recentTickets.data ?? [],
      },
    );
  },
);
