/**
 * @kit/integration-core
 *
 * Core types and interfaces for meeting integrations.
 * This package is provider-agnostic and defines contracts that
 * specific providers (Google, Zoom, Microsoft) must implement.
 */

// =============================================================================
// PROVIDER TYPES
// =============================================================================

/**
 * Supported meeting providers
 */
export type MeetingProvider = 'MANUAL' | 'GOOGLE' | 'ZOOM' | 'MICROSOFT_TEAMS';

/**
 * Meeting types
 */
export type MeetingType = 'logged' | 'scheduled';

/**
 * Participant types
 */
export type ParticipantType = 'INTERNAL' | 'EXTERNAL';

/**
 * RSVP response status
 */
export type ResponseStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'MAYBE';

/**
 * Reminder channels
 */
export type ReminderChannel = 'EMAIL' | 'IN_APP' | 'PUSH';

/**
 * Meeting status
 */
export type MeetingStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

/**
 * Integration connection status
 */
export type ConnectionStatus = 'active' | 'inactive' | 'error';

/**
 * Integration account access scope
 */
export type AccessScope = 'private' | 'workspace';

// =============================================================================
// MEETING TYPES
// =============================================================================

/**
 * Core meeting data structure
 */
export interface Meeting {
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
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

/**
 * Meeting participant
 */
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
}

/**
 * Meeting note
 */
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

/**
 * Meeting reminder configuration
 */
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

// =============================================================================
// INTEGRATION TYPES
// =============================================================================

/**
 * Integration connection (workspace-level)
 */
export interface IntegrationConnection {
  id: string;
  workspace_id: string;
  provider: MeetingProvider | string;
  status: ConnectionStatus;
  config: Record<string, unknown>;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

/**
 * Integration account (connected external account)
 */
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
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

/**
 * Integration tokens (OAuth credentials)
 */
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
// PROVIDER INPUT/OUTPUT TYPES
// =============================================================================

/**
 * Input for creating a meeting via provider
 */
export interface CreateMeetingInput {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  timezone: string;
  attendees?: MeetingAttendeeInput[];
  location?: string;
  recurrence?: RecurrenceRule;
}

/**
 * Attendee input for provider meeting creation
 */
export interface MeetingAttendeeInput {
  email: string;
  display_name?: string;
  is_optional?: boolean;
}

/**
 * Recurrence rule for recurring meetings
 */
export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval?: number;
  count?: number;
  until?: string;
  by_day?: string[];
}

/**
 * Result from provider meeting creation
 */
export interface CreateMeetingResult {
  provider_event_id: string;
  provider_meeting_id?: string;
  meeting_url?: string;
  join_url?: string;
  conference_id?: string;
}

/**
 * Input for updating a meeting via provider
 */
export interface UpdateMeetingInput {
  provider_event_id: string;
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  timezone?: string;
  attendees?: MeetingAttendeeInput[];
  location?: string;
}

/**
 * Result from provider meeting update
 */
export interface UpdateMeetingResult {
  provider_event_id: string;
  meeting_url?: string;
}

/**
 * Input for cancelling/deleting a meeting via provider
 */
export interface CancelMeetingInput {
  provider_event_id: string;
  notify_attendees?: boolean;
  cancellation_reason?: string;
}

// =============================================================================
// OAUTH TYPES
// =============================================================================

/**
 * OAuth configuration
 */
export interface OAuthConfig {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  scopes: string[];
}

/**
 * OAuth tokens
 */
export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  token_type: string;
  scopes?: string[];
}

/**
 * OAuth authorization URL generation input
 */
export interface GenerateAuthUrlInput {
  state: string;
  scopes?: string[];
}

/**
 * User info from OAuth provider
 */
export interface OAuthUserInfo {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

// =============================================================================
// PROVIDER INTERFACES
// =============================================================================

/**
 * Meeting provider interface
 * All meeting providers (Google, Zoom, Microsoft) must implement this
 */
export interface IMeetingProvider {
  /**
   * Provider identifier
   */
  readonly provider: MeetingProvider;

  /**
   * Create a meeting via the provider
   */
  createMeeting(input: CreateMeetingInput): Promise<CreateMeetingResult>;

  /**
   * Update an existing meeting
   */
  updateMeeting(input: UpdateMeetingInput): Promise<UpdateMeetingResult>;

  /**
   * Cancel/delete a meeting
   */
  cancelMeeting(input: CancelMeetingInput): Promise<void>;

  /**
   * Get meeting details from provider
   */
  getMeeting(providerEventId: string): Promise<CreateMeetingResult | null>;
}

/**
 * OAuth provider interface
 * Handles OAuth flow for integration providers
 */
export interface IOAuthProvider {
  /**
   * Generate authorization URL
   */
  generateAuthUrl(input: GenerateAuthUrlInput): string;

  /**
   * Exchange authorization code for tokens
   */
  exchangeCode(code: string): Promise<OAuthTokens>;

  /**
   * Refresh access token
   */
  refreshToken(refreshToken: string): Promise<OAuthTokens>;

  /**
   * Revoke tokens
   */
  revokeToken(token: string): Promise<void>;

  /**
   * Get user info from provider
   */
  getUserInfo(accessToken: string): Promise<OAuthUserInfo>;
}

/**
 * Calendar provider interface (for Google, Microsoft)
 */
export interface ICalendarProvider extends IMeetingProvider {
  /**
   * Create calendar event with meeting
   */
  createCalendarEvent(input: CreateMeetingInput): Promise<CreateMeetingResult>;

  /**
   * Update calendar event
   */
  updateCalendarEvent(input: UpdateMeetingInput): Promise<UpdateMeetingResult>;

  /**
   * Delete calendar event
   */
  deleteCalendarEvent(providerEventId: string): Promise<void>;

  /**
   * Get calendar events in a time range
   */
  getCalendarEvents(
    startTime: string,
    endTime: string,
  ): Promise<CreateMeetingResult[]>;
}

// =============================================================================
// PROVIDER FACTORY
// =============================================================================

/**
 * Provider factory interface
 */
export interface IProviderFactory {
  /**
   * Create a meeting provider instance
   */
  createMeetingProvider(tokens: OAuthTokens): IMeetingProvider;

  /**
   * Create an OAuth provider instance
   */
  createOAuthProvider(config: OAuthConfig): IOAuthProvider;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Integration error codes
 */
export enum IntegrationErrorCode {
  AUTH_FAILED = 'AUTH_FAILED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  NOT_FOUND = 'NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INVALID_INPUT = 'INVALID_INPUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

/**
 * Integration error
 */
export class IntegrationError extends Error {
  constructor(
    public code: IntegrationErrorCode,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'IntegrationError';
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if a token is expired
 */
export function isTokenExpired(
  expiresAt: string | number | undefined,
): boolean {
  if (!expiresAt) return true;
  const expiry =
    typeof expiresAt === 'number' ? expiresAt : new Date(expiresAt).getTime();
  // Consider expired if within 5 minutes of expiry
  return Date.now() >= expiry - 5 * 60 * 1000;
}

/**
 * Calculate reminder scheduled time
 */
export function calculateReminderTime(
  meetingStartTime: string,
  offsetMinutes: number,
): string {
  const meetingTime = new Date(meetingStartTime);
  const reminderTime = new Date(
    meetingTime.getTime() - offsetMinutes * 60 * 1000,
  );
  return reminderTime.toISOString();
}

/**
 * Format meeting duration
 */
export function formatDuration(startTime: string, endTime: string): string {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationMs = end.getTime() - start.getTime();
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
export const name = 'integration-core';
