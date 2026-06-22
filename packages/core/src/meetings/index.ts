/**
 * Core Meetings Module
 * Exports meetings components and types
 */

export { CoreEntityPanel } from '../pages';

// Re-export types from meetings types
export type {
  CoreMeeting,
  MeetingRelation,
  MeetingParticipant,
  MeetingNote,
  MeetingReminder,
  IntegrationConnection,
  IntegrationAccount,
  IntegrationTokens,
  CreateMeetingInput,
  UpdateMeetingInput,
  LogMeetingInput,
  CreateParticipantInput,
  CreateNoteInput,
  CreateReminderInput,
  MeetingQueryParams,
} from './types';

export type {
  MeetingProvider,
  MeetingType,
  MeetingStatus,
  ParticipantType,
  ResponseStatus,
  ReminderChannel,
} from '@kit/integration-core';
export { CoreEntityPanel } from '../pages';
