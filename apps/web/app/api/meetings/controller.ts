import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse
} from '../../../utils/response-handler';
import { getRelatedEntityIds } from '../_helpers/get-related-entities';
import { getEntityName } from '../_helpers/get-entity-name';

// Map UI sales entity types to database convention (sales_*)
function toDbEntityType(type: string): string {
  const salesTypes = ['lead', 'contact', 'account', 'opportunity'];
  if (salesTypes.includes(type)) {
    return `sales_${type}`;
  }
  return type;
}

// Map database convention (sales_*) back to UI types
function toUiEntityType(type: string): string {
  if (type?.startsWith('sales_')) {
    return type.substring(6);
  }
  return type;
}

import { MeetingsService } from '@kit/core';

/**
 * GET /api/meetings
 * Fetch meetings for an entity
 * Includes meetings from related entities (lead conversion chain)
 * Filters by user unless workspace owner
 */
export const getMeetings = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const url = new URL(request.url);
    const entityType = url.searchParams.get('entityType');
    const entityId = url.searchParams.get('entityId');
    const workspaceId = url.searchParams.get('workspaceId');

    const searchTerm = url.searchParams.get('searchTerm') || '';
    const createdByIds = url.searchParams.get('createdByIds') || '';
    const statuses = url.searchParams.get('statuses') || '';
    const timeframe = url.searchParams.get('timeframe') || '';
    const createdAtFrom = url.searchParams.get('createdAtFrom') || '';
    const createdAtTo = url.searchParams.get('createdAtTo') || '';
    const updatedAtFrom = url.searchParams.get('updatedAtFrom') || '';
    const updatedAtTo = url.searchParams.get('updatedAtTo') || '';

    const pageParam = url.searchParams.get('page');
    const limitParam = url.searchParams.get('limit');
    const page = pageParam ? parseInt(pageParam, 10) : null;
    const limit = limitParam ? parseInt(limitParam, 10) : null;

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
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

    // Check if user is workspace owner
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();

    const isWorkspaceOwner = workspace?.owner_id === user.id;

    const meetingsService = new MeetingsService(supabase);
    const result = await meetingsService.getMeetings({
      workspaceId,
      entityType,
      entityId,
      statuses,
      timeframe,
      searchTerm,
      createdByIds,
      createdAtFrom,
      createdAtTo,
      updatedAtFrom,
      updatedAtTo,
      isWorkspaceOwner,
      userId: user.id,
      page,
      limit,
    });

    const rawList = Array.isArray(result) ? result : (result.data || []);

    if (pageParam || limitParam) {
      return NextResponse.json({
        success: true,
        data: rawList,
        count: result.total ?? rawList.length,
        total: result.total ?? rawList.length,
        page: result.page ?? 1,
        limit: result.limit ?? rawList.length,
        has_more: result.has_more ?? false,
      });
    }

    return successDataResponse(rawList);
  },
);

/**
 * POST /api/meetings
 * Create a new meeting
 */
export const createMeeting = catchAsync(
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
      entity_type,
      entity_id,
      title,
      start_time,
      end_time,
      location,
      meeting_link,
    } = body;

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const dbType = toDbEntityType(entity_type);

    const { data: meeting, error } = await supabase
      .from('crm_meetings')
      .insert({
        workspace_id,
        entity_type: dbType,
        entity_id,
        title,
        start_time,
        end_time,
        location,
        meeting_link,
        created_by: user.id,
      })
      .select('*, created_by_user:accounts(name, email)')
      .single();

    if (error) {
      console.error('Create meeting error:', error);
      throw error;
    }

    return successDataResponse('Meeting created', meeting);
  },
);

export const updateMeeting = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const meetingId = params?.id;
    const body = await request.json();
    const { title, start_time, end_time, location, meeting_link } = body;

    if (!meetingId) {
      return NextResponse.json({ message: 'ID required' }, { status: 400 });
    }

    const { data: meeting, error } = await supabase
      .from('crm_meetings')
      .update({
        title,
        start_time,
        end_time,
        location,
        meeting_link,
        updated_at: new Date().toISOString(),
      })
      .eq('id', meetingId)
      .select('*, created_by_user:accounts(name, email)')
      .single();

    if (error) {
      console.error('Update meeting error:', error);
      throw error;
    }

    return successDataResponse('Meeting updated', meeting);
  },
);

export const deleteMeeting = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const meetingId = params?.id;

    if (!meetingId) {
      return NextResponse.json({ message: 'ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('crm_meetings')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', meetingId);

    if (error) {
      console.error('Delete meeting error:', error);
      throw error;
    }

    return successDataResponse('Meeting deleted');
  },
);
