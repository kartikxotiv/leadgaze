import { formatDate } from '@kit/shared/utils';
export function formatPayrollEmployeeName(
  employee:
    | {
        first_name?: string | null;
        last_name?: string | null;
      }
    | null
    | undefined,
) {
  if (!employee) {
    return 'Unknown';
  }

  return [employee.first_name, employee.last_name].filter(Boolean).join(' ');
}

export function formatPayrollRunPeriod(
  run:
    | {
        period_start?: string | null;
        period_end?: string | null;
      }
    | null
    | undefined,
) {
  if (!run?.period_start || !run?.period_end) {
    return '';
  }

  const start = formatDate(run.period_start);
  const end = formatDate(run.period_end);

  return `${start} to ${end}`;
}

export function isAssignmentEligibleForPayrollRun(
  assignment: {
    is_primary?: boolean | null;
    status?: string | null;
    effective_from?: string | null;
    effective_to?: string | null;
  },
  run: {
    period_start?: string | null;
    period_end?: string | null;
  },
) {
  if (!assignment?.is_primary || assignment?.status !== 'active') {
    return false;
  }

  if (!assignment.effective_from || !run.period_start || !run.period_end) {
    return false;
  }

  const assignmentStart = new Date(assignment.effective_from);
  const assignmentEnd = assignment.effective_to
    ? new Date(assignment.effective_to)
    : null;
  const runStart = new Date(run.period_start);
  const runEnd = new Date(run.period_end);

  return (
    assignmentStart <= runEnd && (!assignmentEnd || assignmentEnd >= runStart)
  );
}
