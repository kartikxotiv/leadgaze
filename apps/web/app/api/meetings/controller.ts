import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse,
  successResponse,
} from '../../../utils/response-handler';

/**
 * GET /api/meetings
 * Fetch meetings for an entity
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

    if (!entityType || !entityId || !workspaceId) {
      return NextResponse.json(
        { message: 'entityType, entityId, and workspaceId are required' },
        { status: 400 },
      );
    }

    const { data: meetings, error } = await supabase
      .from('crm_meetings')
      .select('*, created_by_user:accounts(name, email)')
      .eq('workspace_id', workspaceId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('is_deleted', false)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Get meetings error:', error);
      throw error;
    }

    return successDataResponse('Meetings retrieved', meetings || []);
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

    const { data: meeting, error } = await supabase
      .from('crm_meetings')
      .insert({
        workspace_id,
        entity_type,
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

    return successResponse('Meeting deleted');
  },
);
