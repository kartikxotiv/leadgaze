import { SupabaseClient } from '@supabase/supabase-js';
import { GetMeetingsParams, MeetingItem } from './meetings.types';
import { CorePaginatedResponse } from '../reminders/reminders.types';

export class MeetingsService {
  constructor(private readonly supabase: SupabaseClient) {}

  async getMeetings(params: GetMeetingsParams): Promise<CorePaginatedResponse<MeetingItem>> {
    const {
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
      isWorkspaceOwner = false,
      userId,
      page = null,
      limit = null,
    } = params;

    const createdByArray = createdByIds && createdByIds !== 'all'
      ? createdByIds.split(',').map((id) => id.trim()).filter(Boolean)
      : null;

    const statusArray = statuses
      ? statuses.split(',').map((s) => s.trim()).filter(Boolean)
      : null;

    const { data, error } = await (this.supabase as any).rpc('get_core_meetings', {
      p_workspace_id: workspaceId,
      p_entity_type: entityType || null,
      p_entity_id: entityId || null,
      p_statuses: statusArray,
      p_timeframe: timeframe || null,
      p_search_term: searchTerm || null,
      p_created_by_ids: createdByArray,
      p_created_at_from: createdAtFrom ? (createdAtFrom.includes('T') ? createdAtFrom : `${createdAtFrom}T00:00:00.000Z`) : null,
      p_created_at_to: createdAtTo ? (createdAtTo.includes('T') ? createdAtTo : `${createdAtTo}T23:59:59.999Z`) : null,
      p_updated_at_from: updatedAtFrom ? (updatedAtFrom.includes('T') ? updatedAtFrom : `${updatedAtFrom}T00:00:00.000Z`) : null,
      p_updated_at_to: updatedAtTo ? (updatedAtTo.includes('T') ? updatedAtTo : `${updatedAtTo}T23:59:59.999Z`) : null,
      p_is_workspace_owner: isWorkspaceOwner,
      p_user_id: userId || null,
      p_page: page,
      p_limit: limit,
      p_meeting_type: params.meetingType || null,
      p_provider: params.provider || null,
      p_host_user_id: params.hostUserId || null,
      p_view: params.view || 'my',
      p_is_admin: params.isAdmin || false,
      p_include_participant_meetings: params.includeParticipantMeetings || false,
      p_participant_user_id: params.participantUserId || null,
      p_participant_email: params.participantEmail || null,
    });

    if (error) throw error;
    return (data as CorePaginatedResponse<MeetingItem>) || { data: [], total: 0, page: 1, limit: 0, has_more: false };
  }
}
