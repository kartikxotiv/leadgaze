import { NextRequest } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse,
  errorResponse,
} from '~/utils/response-handler';

/**
 * DELETE /api/meetings/reminders/{id}
 * 
 * Delete a specific meeting reminder by ID.
 */
export const deleteMeetingReminder = catchAsync(
  async ({ 
    request,
    params 
  }: { 
    request: NextRequest;
    params: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient() as any;
    const reminderId = params.id;

    if (!reminderId) {
      return errorResponse('Reminder ID is required', 400);
    }

    try {
      // Check if reminder exists
      const { data: reminder, error: findError } = await supabase
        .schema('core')
        .from('meeting_reminders')
        .select('id, meeting_id')
        .eq('id', reminderId)
        .single();

      if (findError || !reminder) {
        return errorResponse('Meeting reminder not found', 404);
      }

      // Delete the reminder
      const { error } = await supabase
        .schema('core')
        .from('meeting_reminders')
        .delete()
        .eq('id', reminderId);

      if (error) {
        console.error('[Meeting Reminders] Error deleting reminder:', error);
        return errorResponse('Failed to delete meeting reminder', 500);
      }

      console.log(`[Meeting Reminders] Deleted reminder ${reminderId} for meeting ${reminder.meeting_id}`);
      return successDataResponse('Meeting reminder deleted successfully');

    } catch (error) {
      console.error('[Meeting Reminders] Unexpected error:', error);
      return errorResponse(
        error instanceof Error 
          ? `Failed to delete meeting reminder: ${error.message}`
          : 'Failed to delete meeting reminder',
        500
      );
    }
  }
);