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

    if (!entityType || !entityId || !workspaceId) {
      return NextResponse.json(
        { message: 'entityType, entityId, and workspaceId are required' },
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

      // Filter by user unless workspace owner
      if (!isWorkspaceOwner) {
        query = query.eq('created_by', user.id);
      }

      return query;
    });

    // Execute all queries and combine results
    const results = await Promise.all(meetingPromises);
    const allMeetings = results.flatMap((result) => result.data || []);

    // Filter out old meetings (more than 1 day past end time)
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const filteredMeetings = allMeetings.filter((meeting) => {
      const endTime = new Date(meeting.end_time);
      // Show if end time is in the future OR within last 1 day
      return endTime >= oneDayAgo;
    });

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

    const meetings = meetingsWithEntityNames;
    const error = results.find((r) => r.error)?.error;

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

    return successDataResponse('Meeting deleted');
  },
);
