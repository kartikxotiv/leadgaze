import type { LeaveRequestStatus } from '../types/leave.type';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
  }).format(new Date(`${value}T00:00:00`));
}

function formatMonthLabel(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}-01T00:00:00`));
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function getLeaveStatusBadgeClass(status: LeaveRequestStatus) {
  if (status === 'approved') {
    return 'bg-emerald-500/10 text-emerald-700';
  }

  if (status === 'rejected') {
    return 'bg-red-500/10 text-red-700';
  }

  if (status === 'cancelled') {
    return 'bg-slate-500/10 text-slate-700';
  }

  return 'bg-amber-500/10 text-amber-700';
}

export { formatDate, formatMonthLabel, formatNumber, getLeaveStatusBadgeClass };
