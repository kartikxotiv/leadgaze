import type {
  ReportMetric,
  ReportsEmployeeOption,
  ReportsOption,
  ReportsOptions,
  ReportsPermissionSummary,
  ReportsShiftOption,
} from '~/types/reports.type';
import { ApiError } from '~/utils/response-handler';

import { deriveAttendanceDisplayStatus } from '../../attendance/utils';
import type {
  AttendanceRecordRow,
  EmployeeSnapshot,
  ReportsEmployeeReference,
  ReportsEmployeeRow,
  ReportsFilterInput,
  ReportsShiftRow,
} from './types';

const UNASSIGNED_DEPARTMENT = 'Unassigned';
const UNASSIGNED_SHIFT = 'Unassigned';

export function roundNumber(value: number, digits: number = 2) {
  const factor = 10 ** digits;

  return Math.round(value * factor) / factor;
}

export function createEmployeeSnapshot(): EmployeeSnapshot {
  return {
    presentDays: 0,
    lateCount: 0,
    overtimeHours: 0,
    leaveDays: 0,
    netPay: 0,
  };
}

export function toDateOnly(value: string) {
  return new Date(`${value}T00:00:00`);
}

function toIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getCurrentMonthRange() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);

  return {
    from: toIsoDate(start),
    to: toIsoDate(today),
  };
}

export function parseReportsFilters(url: string): ReportsFilterInput {
  const searchParams = new URL(url).searchParams;
  const defaults = getCurrentMonthRange();
  const from = searchParams.get('from') ?? defaults.from;
  const to = searchParams.get('to') ?? defaults.to;
  const start = toDateOnly(from);
  const end = toDateOnly(to);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new ApiError('Invalid report date range', 400);
  }

  if (start > end) {
    throw new ApiError('Report date range is invalid', 400);
  }

  const employeeIds = (searchParams.get('employeeIds') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    from,
    to,
    departmentId: searchParams.get('departmentId') || null,
    employeeIds,
    shiftId: searchParams.get('shiftId') || null,
  };
}

export function getEmployeeName(
  employee?: Pick<ReportsEmployeeReference, 'first_name' | 'last_name'> | null,
) {
  const firstName = employee?.first_name?.trim() ?? '';
  const lastName = employee?.last_name?.trim() ?? '';
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || 'Unknown Employee';
}

export function getDepartmentName(
  employee?: Pick<ReportsEmployeeReference, 'department'> | null,
) {
  return employee?.department?.name ?? UNASSIGNED_DEPARTMENT;
}

export function getShiftName(shift?: ReportsShiftRow | null) {
  return shift?.name ?? UNASSIGNED_SHIFT;
}

export function getDateKeys(from: string, to: string) {
  const keys: string[] = [];
  const cursor = toDateOnly(from);
  const end = toDateOnly(to);

  while (cursor <= end) {
    keys.push(toIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
}

export function getMonthKey(value: string) {
  const date = toDateOnly(value);

  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
}

export function formatRunPeriod(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return `${formatter.format(toDateOnly(start))} - ${formatter.format(toDateOnly(end))}`;
}

export function toReportMetric(
  label: string,
  value: number | string,
  hint: string,
): ReportMetric {
  return { label, value, hint };
}

export function getAccessibleEmployees(params: {
  accessLevel: ReportsPermissionSummary['accessLevel'];
  employeeId: string | null;
  employees: ReportsEmployeeRow[];
}) {
  if (params.accessLevel === 'own') {
    return params.employees.filter(
      (employee) => employee.id === params.employeeId,
    );
  }

  return params.employees;
}

export function applyEmployeeFilters(params: {
  departmentId: string | null;
  employeeIds: string[];
  employees: ReportsEmployeeRow[];
  shiftId: string | null;
}) {
  return params.employees.filter((employee) => {
    if (
      params.departmentId &&
      employee.department?.id !== params.departmentId
    ) {
      return false;
    }

    if (params.shiftId && employee.shift_id !== params.shiftId) {
      return false;
    }

    if (
      params.employeeIds.length > 0 &&
      !params.employeeIds.includes(employee.id)
    ) {
      return false;
    }

    return true;
  });
}

export function buildOptions(employees: ReportsEmployeeRow[]) {
  const departmentsById = new Map<string, ReportsOption>();
  const shiftsById = new Map<string, ReportsShiftOption>();

  const employeeOptions: ReportsEmployeeOption[] = employees
    .map((employee) => {
      if (employee.department) {
        departmentsById.set(employee.department.id, {
          id: employee.department.id,
          label: employee.department.name,
        });
      }

      if (employee.shift) {
        shiftsById.set(employee.shift.id, {
          id: employee.shift.id,
          label: employee.shift.name,
          start_time: employee.shift.start_time,
          end_time: employee.shift.end_time,
        });
      }

      return {
        id: employee.id,
        label: `${getEmployeeName(employee)} (${employee.employee_code})`,
        employee_code: employee.employee_code,
        department_id: employee.department?.id ?? null,
        shift_id: employee.shift_id,
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label));

  return {
    departments: Array.from(departmentsById.values()).sort((left, right) =>
      left.label.localeCompare(right.label),
    ),
    employees: employeeOptions,
    shifts: Array.from(shiftsById.values()).sort((left, right) =>
      left.label.localeCompare(right.label),
    ),
  } satisfies ReportsOptions;
}

export function getRecordStatus(
  record: AttendanceRecordRow | undefined,
  employee: ReportsEmployeeRow,
) {
  const effectiveShift = record?.shift ?? employee.shift;

  if (!record) {
    return 'absent';
  }

  return deriveAttendanceDisplayStatus({
    checkIn: record.check_in,
    checkOut: record.check_out,
    status: record.status,
    shift: effectiveShift
      ? {
          start_time: effectiveShift.start_time,
          end_time: effectiveShift.end_time,
          grace_minutes: effectiveShift.grace_minutes ?? 0,
        }
      : null,
  });
}

function parseShiftTime(value: string) {
  const [hours = '0', minutes = '0'] = value.split(':');

  return {
    hours: Number(hours),
    minutes: Number(minutes),
  };
}

function getShiftWindow(params: {
  date: string;
  shift: ReportsShiftRow | null | undefined;
}) {
  if (!params.shift) {
    return null;
  }

  const start = toDateOnly(params.date);
  const end = toDateOnly(params.date);
  const shiftStart = parseShiftTime(params.shift.start_time);
  const shiftEnd = parseShiftTime(params.shift.end_time);

  start.setHours(shiftStart.hours, shiftStart.minutes, 0, 0);
  end.setHours(shiftEnd.hours, shiftEnd.minutes, 0, 0);

  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }

  return { start, end };
}

export function computeLateEarlyMetrics(params: {
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  shift: ReportsShiftRow | null | undefined;
}) {
  const window = getShiftWindow({ date: params.date, shift: params.shift });

  if (!window) {
    return {
      lateMinutes: 0,
      earlyMinutes: 0,
      scheduledHours: 0,
    };
  }

  const scheduledMinutes = Math.max(
    (window.end.getTime() - window.start.getTime()) / (1000 * 60),
    0,
  );
  const graceMinutes = Math.max(params.shift?.grace_minutes ?? 0, 0);
  const adjustedStart = new Date(
    window.start.getTime() + graceMinutes * 60 * 1000,
  );
  const actualCheckIn = params.checkIn ? new Date(params.checkIn) : null;
  const actualCheckOut = params.checkOut ? new Date(params.checkOut) : null;

  return {
    lateMinutes: actualCheckIn
      ? Math.max(
          Math.round(
            (actualCheckIn.getTime() - adjustedStart.getTime()) / (1000 * 60),
          ),
          0,
        )
      : 0,
    earlyMinutes: actualCheckOut
      ? Math.max(
          Math.round(
            (window.end.getTime() - actualCheckOut.getTime()) / (1000 * 60),
          ),
          0,
        )
      : 0,
    scheduledHours: scheduledMinutes / 60,
  };
}

export function getComponentName(component?: { name?: string | null } | null) {
  return component?.name?.trim() || 'Unknown';
}

export function getComponentCode(component?: { code?: string | null } | null) {
  return component?.code?.trim() || 'NA';
}

export function isOvertimeComponent(component?: {
  code?: string | null;
  name?: string | null;
}) {
  const haystack =
    `${component?.code ?? ''} ${component?.name ?? ''}`.toUpperCase();

  return haystack.includes('OVERTIME') || haystack.startsWith('OT ');
}

export function isBonusOrArrearItem(params: {
  component?: { code?: string | null; name?: string | null } | null;
  sourceType: string;
}) {
  if (['bonus', 'incentive', 'arrear'].includes(params.sourceType)) {
    return true;
  }

  const haystack =
    `${params.component?.code ?? ''} ${params.component?.name ?? ''}`.toUpperCase();

  return haystack.includes('BONUS') || haystack.includes('ARREAR');
}
