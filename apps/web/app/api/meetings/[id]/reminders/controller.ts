import { NextRequest } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse,
  errorResponse,
} from '~/utils/response-handler';

/**
 * GET /api/meetings/{id}/reminders
 * 
 * Get meeting reminders by meeting ID.
 * Replaces: supabase.from('meeting_reminders').select('*').eq('meeting_id', id)
 */
export const getMeetingReminders = catchAsync(
  async ({ 
    request,
    params 
  }: { 
    request: NextRequest;
    params: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient() as any;
    const meetingId = params.id;

    if (!meetingId) {
      return errorResponse('Meeting ID is required', 400);
    }

    try {
      const { data, error } = await supabase
        .schema('core')
        .from('meeting_reminders')
        .select('id, meeting_id, offset_minutes, created_at, updated_at')
        .eq('meeting_id', meetingId)
        .order('offset_minutes', { ascending: true });

      if (error) {
        console.error('[Meeting Reminders] Error fetching reminders:', error);
        return errorResponse('Failed to fetch meeting reminders', 500);
      }

      console.log(`[Meeting Reminders] Retrieved ${data?.length || 0} reminders for meeting ${meetingId}`);
      return successDataResponse('Meeting reminders retrieved successfully', data || []);

    } catch (error) {
      console.error('[Meeting Reminders] Unexpected error:', error);
      return errorResponse(
        error instanceof Error 
          ? `Failed to fetch meeting reminders: ${error.message}`
          : 'Failed to fetch meeting reminders',
        500
      );
    }
  }
);

/**
 * POST /api/meetings/{id}/reminders
 * 
 * Create a new meeting reminder.
 */
export const createMeetingReminder = catchAsync(
  async ({ 
    request,
    params 
  }: { 
    request: NextRequest;
    params: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient() as any;
    const meetingId = params.id;

    if (!meetingId) {
      return errorResponse('Meeting ID is required', 400);
    }

    try {
      const body = await request.json();
      const { offset_minutes } = body;

      if (typeof offset_minutes !== 'number' || offset_minutes < 0) {
        return errorResponse('offset_minutes must be a non-negative number', 400);
      }

      // Check if meeting exists
      const { data: meeting, error: meetingError } = await supabase
        .schema('core')
        .from('meetings')
        .select('id')
        .eq('id', meetingId)
        .single();

      if (meetingError || !meeting) {
        return errorResponse('Meeting not found', 404);
      }

      // Check if reminder with same offset already exists
      const { data: existingReminder } = await supabase
        .schema('core')
        .from('meeting_reminders')
        .select('id')
        .eq('meeting_id', meetingId)
        .eq('offset_minutes', offset_minutes)
        .single();

      if (existingReminder) {
        return errorResponse('Reminder with this offset already exists for this meeting', 409);
      }

      // Create new reminder
      const { data, error } = await supabase
        .schema('core')
        .from('meeting_reminders')
        .insert({
          meeting_id: meetingId,
          offset_minutes,
        })
        .select()
        .single();

      if (error) {
        console.error('[Meeting Reminders] Error creating reminder:', error);
        return errorResponse('Failed to create meeting reminder', 500);
      }

      console.log(`[Meeting Reminders] Created reminder for meeting ${meetingId} with offset ${offset_minutes} minutes`);
      return successDataResponse('Meeting reminder created successfully', data);

    } catch (error) {
      console.error('[Meeting Reminders] Unexpected error:', error);
      return errorResponse(
        error instanceof Error 
          ? `Failed to create meeting reminder: ${error.message}`
          : 'Failed to create meeting reminder',
        500
      );
    }
  }
);