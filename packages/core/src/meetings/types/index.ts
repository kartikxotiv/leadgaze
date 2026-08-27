/**
 * Core Meetings Types
 * Aligned with the database schema and integration-core types
 */
import type {
  AccessScope,
  ConnectionStatus,
  MeetingProvider,
  MeetingStatus,
  MeetingType,
  ParticipantType,
  ReminderChannel,
  ResponseStatus,
} from '@kit/integration-core';

// Re-export provider types for convenience
export type {
  MeetingProvider,
  MeetingType,
  MeetingStatus,
  ParticipantType,
  ResponseStatus,
  ReminderChannel,
};

// =============================================================================
// MEETING TYPES
// =============================================================================

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
  cancel_reason?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
  // Joined fields
  relations?: MeetingRelation[];
  participants?: MeetingParticipant[];
  host?: { id: string; name: string | null; email: string | null } | null;
}

export interface MeetingRelation {
  id: string;
  workspace_id: string;
  meeting_id: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
}

// =============================================================================
// PARTICIPANT TYPES
// =============================================================================

export interface MeetingParticipant {
  id: string;
  workspace_id: string;
  meeting_id: string;
  participant_type: ParticipantType;
  internal_user_id?: string | null;
  external_email?: string | null;
  display_name?: string | null;
  is_host: boolean;
  response_status: ResponseStatus;
  joined_at?: string | null;
  left_at?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  internal_user?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

export interface CreateParticipantInput {
  participant_type: ParticipantType;
  internal_user_id?: string;
  external_email?: string;
  display_name?: string;
  is_host?: boolean;
  response_status?: ResponseStatus;
}

// =============================================================================
// NOTE TYPES
// =============================================================================

export interface MeetingNote {
  id: string;
  workspace_id: string;
  meeting_id: string;
  content: string;
  note_type: 'note' | 'summary' | 'transcript' | 'action_items';
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface CreateNoteInput {
  content: string;
  note_type?: 'note' | 'summary' | 'transcript' | 'action_items';
}

// =============================================================================
// REMINDER TYPES
// =============================================================================

export interface MeetingReminder {
  id: string;
  workspace_id: string;
  meeting_id: string;
  offset_minutes: number;
  channel: ReminderChannel;
  scheduled_at: string;
  sent_at?: string | null;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface CreateReminderInput {
  offset_minutes: number;
  channel?: ReminderChannel;
}

// =============================================================================
// INTEGRATION TYPES
// =============================================================================

export interface IntegrationConnection {
  id: string;
  workspace_id: string;
  provider: string;
  status: ConnectionStatus;
  config: Record<string, unknown>;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface IntegrationAccount {
  id: string;
  workspace_id: string;
  connection_id: string;
  external_account_id: string;
  email?: string | null;
  display_name?: string | null;
  metadata: Record<string, unknown>;
  status: ConnectionStatus;
  owner_user_id?: string | null;
  access_scope: AccessScope;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  // Joined fields
  connection?: IntegrationConnection | null;
  tokens?: IntegrationTokens | null;
}

export interface IntegrationTokens {
  id: string;
  workspace_id: string;
  account_id: string;
  access_token: string;
  refresh_token?: string | null;
  expires_at?: string | null;
  token_type: string;
  scopes?: string[] | null;
  last_refreshed_at?: string | null;
  last_error?: string | null;
  error_count: number;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface CreateMeetingInput {
  workspace_id: string;
  meeting_type: MeetingType;
  provider?: MeetingProvider;
  title: string;
  description?: string;
  status?: MeetingStatus;
  scheduled_start?: string;
  scheduled_end?: string;
  timezone?: string;
  meeting_url?: string;
  host_user_id?: string;
  meeting_host_email_account_id?: string;
  location?: string;
  // Relations
  entity_type?: string;
  entity_id?: string;
  relations?: Array<{ entity_type: string; entity_id: string }>;
  // Participants
  participants?: CreateParticipantInput[];
  // Reminders
  reminders?: CreateReminderInput[];
}

export interface UpdateMeetingInput {
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
}

export interface LogMeetingInput {
  workspace_id: string;
  title: string;
  description?: string;
  actual_start: string;
  actual_end: string;
  timezone?: string;
  location?: string;
  notes?: string;
  entity_type?: string;
  entity_id?: string;
  relations?: Array<{ entity_type: string; entity_id: string }>;
  participants?: CreateParticipantInput[];
}

// =============================================================================
// QUERY TYPES
// =============================================================================

export interface MeetingQueryParams {
  workspaceId: string;
  entityType?: string;
  entityId?: string;
  meetingType?: MeetingType;
  provider?: MeetingProvider;
  status?: MeetingStatus;
  startDate?: string;
  endDate?: string;
  hostUserId?: string;
}
