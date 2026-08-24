import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import type { Database } from '~/lib/database.types';

import {
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';

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
      .select(
        'id, status_name, status_key, color, icon, is_closed, is_active, is_system, is_default, sort_order',
      )
      .eq('workspace_id', workspaceId)
      .eq('module_id', module.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

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

    const {
      data: records,
      error,
      count,
    } = await adminClient
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

    const mapped = (records || []).map((record) => ({
      id: record.id,
      name: [record.first_name, record.last_name].filter(Boolean).join(' '),
      email: record.email || null,
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
      .update({
        status_id: new_status_id,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
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
      .update({
        is_active: false,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', oldStatusId);

    if (disableError) {
      console.error('Disable status error:', disableError);
      throw disableError;
    }

    return successDataResponse(
      'Leads reassigned and status disabled successfully',
      {
        reassigned_count: reassignedCount ?? 0,
        disabled_status_id: oldStatusId,
      },
    );
  },
);

/**
 * POST /api/leads/sources
 * Create a new lead source
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

    const updateData: Record<string, unknown> = {};
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

/**
 * PUT /api/leads/statuses/reorder
 * Bulk-update sort_order for lead statuses.
 * Body: { workspaceId: string, orderedStatusIds: string[] }
 */

const reorderLeadStatuses = catchAsync(
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

    const updatePromises = orderedStatusIds.map(
      (statusId: string, index: number) =>
        supabase
          .from('entity_statuses')
          .update({
            sort_order: index,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', statusId)
          .eq('workspace_id', workspaceId),
    );

    const results = await Promise.all(updatePromises);
    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      console.error(
        'Errors updating lead status order:',
        errors.map((e) => e.error),
      );
      throw new Error('Failed to update all lead status orderings');
    }

    return successDataResponse('Lead statuses reordered successfully', null);
  },
);

export {
  getLeadStatuses,
  getAffectedLeads,
  reassignLeadStatus,
  createLeadStatus,
  updateLeadStatus,
  deleteLeadStatus,
  reorderLeadStatuses,
};
