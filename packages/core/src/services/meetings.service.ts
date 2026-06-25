/**
 * Core Meetings Service
 * Client-side service for interacting with meetings API
 */
import { CoreApiClient } from '../utils';
import { asyncHandlerClient } from '../utils/async-handler';
import { entityQuery } from './_entity-query';

// =============================================================================
// MEETING TYPES
// =============================================================================

export type MeetingType = 'logged' | 'scheduled';
export type MeetingProvider = 'MANUAL' | 'GOOGLE' | 'ZOOM' | 'MICROSOFT_TEAMS';
export type MeetingStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled';
export type ParticipantType = 'INTERNAL' | 'EXTERNAL';
export type ResponseStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'MAYBE';
export type ReminderChannel = 'EMAIL' | 'IN_APP' | 'PUSH';

export interface CoreMeeting {
  id: string;
  workspace_id: string;
  meeting_type: MeetingType;
  provider: MeetingProvider;
  title: string;
  description?: string | null;
  status: MeetingStatus;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  actual_start?: string | null;
  actual_end?: string | null;
  timezone: string;
  meeting_url?: string | null;
  provider_event_id?: string | null;
  provider_meeting_id?: string | null;
  host_user_id?: string | null;
  meeting_host_email_account_id?: string | null;
  location?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  host?: { id: string; name: string | null; email: string | null } | null;
  relations?: Array<{
    id: string;
    entity_type: string;
    entity_id: string;
  }>;
  participants?: MeetingParticipant[];
  entity_type?: string | null;
  entity_id?: string | null;
}

export interface MeetingParticipant {
  id: string;
  meeting_id: string;
  participant_type: ParticipantType;
  internal_user_id?: string | null;
  external_email?: string | null;
  display_name?: string | null;
  is_host: boolean;
  response_status: ResponseStatus;
  internal_user?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

export interface MeetingNote {
  id: string;
  meeting_id: string;
  content: string;
  note_type: 'note' | 'summary' | 'transcript' | 'action_items';
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntegrationAccount {
  id: string;
  workspace_id: string;
  connection_id: string;
  external_account_id: string;
  email?: string | null;
  display_name?: string | null;
  status: string;
  owner_user_id?: string | null;
  access_scope: 'private' | 'workspace';
  connection?: {
    id: string;
    provider: string;
    status: string;
  } | null;
}

// =============================================================================
// MEETING SERVICES
// =============================================================================

export const getMeetingsService = asyncHandlerClient(
  async (
    workspaceId: string,
    entityType?: string,
    entityId?: string,
    meetingType?: MeetingType,
    includeParticipantMeetings?: boolean,
    participantUserId?: string,
  ) => {
    let url = `/meetings?workspaceId=${workspaceId}`;
    if (entityType) url += `&entityType=${entityType}`;
    if (entityId) url += `&entityId=${entityId}`;
    if (meetingType) url += `&meetingType=${meetingType}`;
    if (includeParticipantMeetings) url += `&includeParticipantMeetings=true`;
    if (participantUserId) url += `&participantUserId=${participantUserId}`;
    const res = await CoreApiClient.get(url);
    return (res?.data?.data ?? []) as CoreMeeting[];
  },
);

export const getMeetingByIdService = asyncHandlerClient(
  async (workspaceId: string, id: string) => {
    const res = await CoreApiClient.get(
      `/meetings?workspaceId=${workspaceId}&id=${id}`,
    );
    return (res?.data?.data ?? null) as CoreMeeting | null;
  },
);

export const createMeetingService = asyncHandlerClient(
  async (payload: {
    workspace_id: string;
    meeting_type?: MeetingType;
    provider?: MeetingProvider;
    title: string;
    description?: string;
    status?: MeetingStatus;
    scheduled_start?: string;
    scheduled_end?: string;
    actual_start?: string;
    actual_end?: string;
    timezone?: string;
    meeting_url?: string;
    provider_event_id?: string;
    provider_meeting_id?: string;
    host_user_id?: string;
    meeting_host_email_account_id?: string;
    location?: string;
    entity_type?: string;
    entity_id?: string;
    relations?: Array<{ entity_type: string; entity_id: string }>;
    participants?: Array<{
      participant_type?: ParticipantType;
      internal_user_id?: string;
      external_email?: string;
      display_name?: string;
      is_host?: boolean;
    }>;
    reminders?: Array<{ offset_minutes: number; channel?: ReminderChannel }>;
  }) => {
    const res = await CoreApiClient.post('/meetings', payload);
    return res?.data?.data as CoreMeeting;
  },
);

export const updateMeetingService = asyncHandlerClient(
  async (payload: {
    id: string;
    workspace_id: string;
    title?: string;
    description?: string;
    status?: MeetingStatus;
    scheduled_start?: string;
    scheduled_end?: string;
    actual_start?: string;
    actual_end?: string;
    timezone?: string;
    meeting_url?: string;
    host_user_id?: string;
    meeting_host_email_account_id?: string;
    location?: string;
    participants?: Array<{
      participant_type?: string;
      internal_user_id?: string;
      external_email?: string;
      display_name?: string;
      is_host?: boolean;
      response_status?: string;
    }>;
    attendees?: Array<{ email: string; display_name?: string }>;
    send_invites?: boolean;
  }) => {
    const res = await CoreApiClient.patch('/meetings', payload);
    return res?.data?.data as CoreMeeting;
  },
);

export const cancelMeetingService = asyncHandlerClient(
  async (workspaceId: string, id: string) => {
    const res = await CoreApiClient.patch('/meetings', {
      id,
      workspace_id: workspaceId,
      status: 'cancelled',
    });
    return res?.data?.data as CoreMeeting;
  },
);

export const deleteMeetingService = asyncHandlerClient(
  async (workspaceId: string, id: string) => {
    const res = await CoreApiClient.delete(
      `/meetings?workspaceId=${workspaceId}&id=${id}`,
    );
    return res?.data?.data;
  },
);

// =============================================================================
// PARTICIPANT SERVICES
// =============================================================================

export const getMeetingParticipantsService = asyncHandlerClient(
  async (workspaceId: string, meetingId: string) => {
    const res = await CoreApiClient.get(
      `/meeting-participants?workspaceId=${workspaceId}&meetingId=${meetingId}`,
    );
    return (res?.data?.data ?? []) as MeetingParticipant[];
  },
);

export const addMeetingParticipantService = asyncHandlerClient(
  async (payload: {
    workspace_id: string;
    meeting_id: string;
    participant_type?: ParticipantType;
    internal_user_id?: string;
    external_email?: string;
    display_name?: string;
    is_host?: boolean;
  }) => {
    const res = await CoreApiClient.post('/meeting-participants', payload);
    return res?.data?.data as MeetingParticipant;
  },
);

export const updateMeetingParticipantService = asyncHandlerClient(
  async (payload: {
    id: string;
    workspace_id: string;
    response_status?: ResponseStatus;
    display_name?: string;
    is_host?: boolean;
  }) => {
    const res = await CoreApiClient.patch('/meeting-participants', payload);
    return res?.data?.data as MeetingParticipant;
  },
);

// =============================================================================
// NOTE SERVICES
// =============================================================================

export const getMeetingNotesService = asyncHandlerClient(
  async (workspaceId: string, meetingId: string) => {
    const res = await CoreApiClient.get(
      `/meeting-notes?workspaceId=${workspaceId}&meetingId=${meetingId}`,
    );
    return (res?.data?.data ?? []) as MeetingNote[];
  },
);

export const createMeetingNoteService = asyncHandlerClient(
  async (payload: {
    workspace_id: string;
    meeting_id: string;
    content: string;
    note_type?: 'note' | 'summary' | 'transcript' | 'action_items';
  }) => {
    const res = await CoreApiClient.post('/meeting-notes', payload);
    return res?.data?.data as MeetingNote;
  },
);

export const updateMeetingNoteService = asyncHandlerClient(
  async (payload: {
    id: string;
    workspace_id: string;
    content?: string;
    note_type?: string;
  }) => {
    const res = await CoreApiClient.patch('/meeting-notes', payload);
    return res?.data?.data as MeetingNote;
  },
);

export const deleteMeetingNoteService = asyncHandlerClient(
  async (workspaceId: string, id: string) => {
    const res = await CoreApiClient.delete(
      `/meeting-notes?workspaceId=${workspaceId}&id=${id}`,
    );
    return res?.data?.data;
  },
);

// =============================================================================
// INTEGRATION SERVICES
// =============================================================================

export const getIntegrationAccountsService = asyncHandlerClient(
  async (workspaceId: string, provider?: string) => {
    let url = `/integrations/accounts?workspaceId=${workspaceId}`;
    if (provider) url += `&provider=${provider}`;
    const res = await CoreApiClient.get(url);
    return (res?.data?.data ?? []) as IntegrationAccount[];
  },
);

export const deleteIntegrationAccountService = asyncHandlerClient(
  async (workspaceId: string, accountId: string) => {
    const res = await CoreApiClient.delete(
      `/integrations/accounts?workspaceId=${workspaceId}&id=${accountId}`,
    );
    return res?.data?.data;
  },
);

export const createGoogleMeetingService = asyncHandlerClient(
  async (payload: {
    workspace_id: string;
    account_id: string;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    timezone?: string;
    attendees?: Array<{ email: string; display_name?: string }>;
    send_invites?: boolean;
  }) => {
    const res = await CoreApiClient.post(
      '/integrations/google/create-meeting',
      payload,
    );
    return res?.data?.data as {
      provider_event_id: string;
      provider_meeting_id?: string;
      meeting_url?: string;
    };
  },
);

export const updateGoogleMeetingService = asyncHandlerClient(
  async (payload: {
    workspace_id: string;
    account_id: string;
    provider_event_id: string;
    title?: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    timezone?: string;
    attendees?: Array<{ email: string; display_name?: string }>;
    send_invites?: boolean;
  }) => {
    const res = await CoreApiClient.post(
      '/integrations/google/update-meeting',
      payload,
    );
    return res?.data?.data as {
      provider_event_id: string;
    };
  },
);

export const deleteGoogleMeetingService = asyncHandlerClient(
  async (payload: {
    workspace_id: string;
    account_id: string;
    provider_event_id: string;
  }) => {
    const res = await CoreApiClient.post(
      '/integrations/google/delete-meeting',
      payload,
    );
    return res?.data;
  },
);

// =============================================================================
// ZOOM INTEGRATION SERVICES
// =============================================================================

export const createZoomMeetingService = asyncHandlerClient(
  async (payload: {
    workspace_id: string;
    account_id: string;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    timezone?: string;
    attendees?: Array<{ email: string; display_name?: string }>;
  }) => {
    const res = await CoreApiClient.post(
      '/integrations/zoom/create-meeting',
      payload,
    );
    return res?.data?.data as {
      provider_event_id: string;
      provider_meeting_id?: string;
      meeting_url?: string;
    };
  },
);

export const updateZoomMeetingService = asyncHandlerClient(
  async (payload: {
    workspace_id: string;
    account_id: string;
    provider_event_id: string;
    title?: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    timezone?: string;
  }) => {
    const res = await CoreApiClient.post(
      '/integrations/zoom/update-meeting',
      payload,
    );
    return res?.data?.data as {
      provider_event_id: string;
    };
  },
);

export const deleteZoomMeetingService = asyncHandlerClient(
  async (payload: {
    workspace_id: string;
    account_id: string;
    provider_event_id: string;
  }) => {
    const res = await CoreApiClient.post(
      '/integrations/zoom/delete-meeting',
      payload,
    );
    return res?.data;
  },
);
// import { CoreApiClient } from '../utils';
// import { asyncHandlerClient } from '../utils/async-handler';
// import { entityQuery } from './_entity-query';

// export const getMeetingsService = asyncHandlerClient(async (workspaceId: string, entityType?: string, entityId?: string) => {
//   const res = await CoreApiClient.get(`/meetings?${entityQuery(workspaceId, entityType, entityId)}`);
//   return res?.data?.data ?? [];
// });

// export const createMeetingService = asyncHandlerClient(async (payload: Record<string, unknown>) => {
//   const res = await CoreApiClient.post('/meetings', payload);
//   return res?.data?.data;
// });

// export const updateMeetingService = asyncHandlerClient(async (payload: Record<string, unknown>) => {
//   const res = await CoreApiClient.patch('/meetings', payload);
//   return res?.data?.data;
// });

// export const cancelMeetingService = asyncHandlerClient(async (payload: Record<string, unknown>) => {
//   const res = await CoreApiClient.patch('/meetings', { ...payload, status: 'cancelled' });
//   return res?.data?.data;
// });

// export const deleteMeetingService = asyncHandlerClient(async (workspaceId: string, id: string) => {
//   const res = await CoreApiClient.delete(`/meetings?workspaceId=${workspaceId}&id=${id}`);
//   return res?.data?.data;
// });
