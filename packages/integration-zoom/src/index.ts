/**
 * @kit/integration-zoom
 *
 * Zoom integration package for Leadgaze Meetings Platform
 * Provides Zoom OAuth and Meeting integration
 */

export {
  ZoomOAuthProvider,
  createZoomOAuthProvider,
  ZOOM_SCOPES,
} from './zoom-oauth-provider';

export {
  ZoomMeetingProvider,
  createZoomMeetingProvider,
} from './zoom-meeting-provider';

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
  IProviderFactory,
} from '@kit/integration-core';

export {
  IntegrationError,
  IntegrationErrorCode,
  isTokenExpired,
  calculateReminderTime,
  formatDuration,
} from '@kit/integration-core';

export const name = 'integration-zoom';
