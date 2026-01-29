/**
 * Configuration for meeting reminder notifications
 * Defines the intervals at which to send reminder emails before a meeting starts
 */

export interface MeetingReminderInterval {
  /** Minutes before the meeting to send the reminder */
  minutes: number;
  /** Human-readable label for this interval */
  label: string;
}

/**
 * Default reminder intervals for meetings
 * Notifications will be sent at these intervals before the meeting start time
 */
export const MEETING_REMINDER_INTERVALS: MeetingReminderInterval[] = [
  {
    minutes: 60,
    label: '1 hour before',
  },
  {
    minutes: 30,
    label: '30 minutes before',
  },
  {
    minutes: 5,
    label: '5 minutes before',
  },
];

/**
 * Configuration for reminder notifications
 */
export const REMINDER_CONFIG = {
  /** How far back to look for overdue reminders (in days) */
  lookbackDays: 7,

  /** Whether to check reminders that are already marked complete */
  includeCompleted: false,
} as const;
