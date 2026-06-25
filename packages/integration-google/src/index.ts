/**
 * @kit/integration-google
 *
 * Google integration package for Leadgaze Meetings Platform
 * Provides Google OAuth, Calendar, and Meet integration
 */

export {
  GoogleOAuthProvider,
  createGoogleOAuthProvider,
  GOOGLE_CALENDAR_SCOPES,
} from './google-oauth-provider';

export {
  GoogleCalendarProvider,
  createGoogleCalendarProvider,
} from './google-calendar-provider';

// Re-export core types for convenience
export type {
  MeetingProvider,
  MeetingType,
  ParticipantType,
  ResponseStatus,
  ReminderChannel,
  MeetingStatus,
  ConnectionStatus,
  AccessScope,
  Meeting,
  MeetingParticipant,
  MeetingNote,
  MeetingReminder,
  IntegrationConnection,
  IntegrationAccount,
  IntegrationTokens,
  CreateMeetingInput,
  MeetingAttendeeInput,
  RecurrenceRule,
  CreateMeetingResult,
  UpdateMeetingInput,
  UpdateMeetingResult,
  CancelMeetingInput,
  OAuthConfig,
  OAuthTokens,
  GenerateAuthUrlInput,
  OAuthUserInfo,
  IMeetingProvider,
  IOAuthProvider,
  ICalendarProvider,
  IProviderFactory,
} from '@kit/integration-core';

export {
  IntegrationError,
  IntegrationErrorCode,
  isTokenExpired,
  calculateReminderTime,
  formatDuration,
} from '@kit/integration-core';
export const name = 'integration-google';
