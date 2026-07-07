import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse
} from '../../../utils/response-handler';
import { getRelatedEntityIds } from '../_helpers/get-related-entities';
import { getEntityName } from '../_helpers/get-entity-name';

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

    let allMeetings: any[] = [];

    if (entityType && entityId) {
      // Get all related entity IDs (includes lead conversion chain)
      const entityIds = await getRelatedEntityIds(supabase, entityType, entityId);

      // Build query - fetch meetings for all related entities
      const meetingPromises = entityIds.map(({ entity_type, entity_id }) => {
        let query = supabase
          .from('crm_meetings')
          .select('*, created_by_user:accounts(name, email)')
          .eq('workspace_id', workspaceId)
          .eq('entity_type', entity_type)
          .eq('entity_id', entity_id)
          .eq('is_deleted', false);

        if (!isWorkspaceOwner) {
          query = query.eq('created_by', user.id);
        }

        if (createdByIds && createdByIds !== 'all') {
          const ids = createdByIds.split(',').map((id) => id.trim()).filter(Boolean);
          if (ids.length > 0) {
            query = query.in('created_by', ids);
          }
        }
        if (statuses) {
          const statusList = statuses.split(',').map((s) => s.trim()).filter(Boolean);
          if (statusList.length > 0) {
            query = query.in('status', statusList);
          }
        }
        if (searchTerm) {
          query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
        }
        if (createdAtFrom) query = query.gte('created_at', `${createdAtFrom}T00:00:00.000Z`);
        if (createdAtTo) query = query.lte('created_at', `${createdAtTo}T23:59:59.999Z`);
        if (updatedAtFrom) query = query.gte('updated_at', `${updatedAtFrom}T00:00:00.000Z`);
        if (updatedAtTo) query = query.lte('updated_at', `${updatedAtTo}T23:59:59.999Z`);

        return query;
      });

      const results = await Promise.all(meetingPromises);
      allMeetings = results.flatMap((result) => result.data || []);
    } else {
      // Fetch all meetings for the workspace
      let query = supabase
        .from('crm_meetings')
        .select('*, created_by_user:accounts(name, email)')
        .eq('workspace_id', workspaceId)
        .eq('is_deleted', false);

      if (!isWorkspaceOwner) {
        query = query.eq('created_by', user.id);
      }

      if (createdByIds && createdByIds !== 'all') {
        const ids = createdByIds.split(',').map((id) => id.trim()).filter(Boolean);
        if (ids.length > 0) {
          query = query.in('created_by', ids);
        }
      }
      if (statuses) {
        const statusList = statuses.split(',').map((s) => s.trim()).filter(Boolean);
        if (statusList.length > 0) {
          query = query.in('status', statusList);
        }
      }
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }
      if (createdAtFrom) query = query.gte('created_at', `${createdAtFrom}T00:00:00.000Z`);
      if (createdAtTo) query = query.lte('created_at', `${createdAtTo}T23:59:59.999Z`);
      if (updatedAtFrom) query = query.gte('updated_at', `${updatedAtFrom}T00:00:00.000Z`);
      if (updatedAtTo) query = query.lte('updated_at', `${updatedAtTo}T23:59:59.999Z`);

      const { data, error } = await query;
      if (error) throw error;
      allMeetings = data || [];
    }

    // Filter out old meetings (more than 1 day past end time)
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let filteredMeetings = allMeetings.filter((meeting) => {
      const endTime = new Date(meeting.end_time);
      // Show if end time is in the future OR within last 1 day
      return endTime >= oneDayAgo;
    });

    if (timeframe) {
      const timeframeList = timeframe.split(',').map((t) => t.trim()).filter(Boolean);
      if (timeframeList.length > 0 && timeframeList.length < 2) {
        const checkTime = new Date();
        filteredMeetings = filteredMeetings.filter((meeting) => {
          const start = meeting.start_time || meeting.scheduled_start || meeting.actual_start;
          if (!start) return timeframeList.includes('upcoming');
          const meetingDate = new Date(start);
          const isUpcoming =
            meetingDate >= checkTime &&
            meeting.status !== 'completed' &&
            meeting.status !== 'cancelled';
          if (timeframeList.includes('upcoming')) return isUpcoming;
          if (timeframeList.includes('past')) return !isUpcoming;
          return true;
        });
      }
    }

    // Remove duplicates
    const uniqueMeetings = Array.from(
      new Map(filteredMeetings.map((meeting) => [meeting.id, meeting])).values(),
    );

    // Sort by start_time ascending
    uniqueMeetings.sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    );

    // Add entity names to each meeting
    const meetingsWithEntityNames = await Promise.all(
      uniqueMeetings.map(async (meeting) => {
        const entityName = await getEntityName(
          supabase,
          meeting.entity_type,
          meeting.entity_id,
        );
        return {
          ...meeting,
          entity_name: entityName,
        };
      }),
    );

    return successDataResponse('Meetings retrieved', meetingsWithEntityNames || []);
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

    return successDataResponse('Meeting deleted');
  },
);
