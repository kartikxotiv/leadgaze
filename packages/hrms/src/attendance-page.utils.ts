import type { AdminAttendanceResponse } from './types/attendance.type';

type AttendanceView = 'my' | 'shifts' | 'team';

const EMPTY_ATTENDANCE_SUMMARY: AdminAttendanceResponse['summary'] = {
  absent: 0,
  inProgress: 0,
  present: 0,
  total: 0,
};

function toISODateString(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatHeaderDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export type { AttendanceView };
export {
  EMPTY_ATTENDANCE_SUMMARY,
  formatHeaderDate,
  formatTime,
  toISODateString,
};
