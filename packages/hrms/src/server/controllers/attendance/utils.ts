import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import type { Database } from '~/lib/database.types';
import { ApiError } from '~/utils/response-handler';

type AttendanceStatusShift = Pick<
  Database['public']['Tables']['shifts']['Row'],
  'start_time' | 'end_time' | 'grace_minutes'
>;
const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5] as const;

async function getRoleKeysForUser(params: {
  accountId: string;
  organizationId: string;
}) {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();

  const { data: ownedOrg, error: ownedOrgError } = await supabaseAdmin
    .from('organizations')
    .select('id')
    .eq('id', params.organizationId)
    .eq('owner_id', params.accountId)
    .maybeSingle();

  if (ownedOrgError) {
    throw new ApiError(ownedOrgError.message, 400);
  }

  if (ownedOrg) {
    // Treat organization owner as admin for access checks.
    return ['admin'];
  }

  const { data: employee, error: employeeError } = await supabaseAdmin
    .from('employees')
    .select('id')
    .eq('organization_id', params.organizationId)
    .eq('account_id', params.accountId)
    .maybeSingle();

  if (employeeError) {
    throw new ApiError(employeeError.message, 400);
  }

  if (!employee) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from('employee_roles')
    .select('role:roles!employee_roles_role_id_fkey(role_key)')
    .eq('organization_id', params.organizationId)
    .eq('employee_id', employee.id);

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return (data ?? [])
    .map((entry) => entry.role?.role_key)
    .filter((value): value is string => Boolean(value));
}

async function requireAttendanceAdmin(params: {
  accountId: string;
  organizationId: string;
}) {
  const roleKeys = await getRoleKeysForUser(params);
  const isAdmin =
    roleKeys.includes('admin') ||
    roleKeys.includes('hr_manager') ||
    roleKeys.includes('hr');

  if (!isAdmin) {
    throw new ApiError('Forbidden', 403);
  }
}

function getDateParam(params?: Record<string, string | string[]>) {
  const date = params?.date;
  const dateValue = Array.isArray(date) ? date[0] : date;

  if (!dateValue) {
    return toISODateString(new Date());
  }

  return dateValue;
}

function toISODateString(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

async function getEmployeeForAccount(params: {
  accountId: string;
  organizationId: string;
}) {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();

  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('id, first_name, last_name, employee_code, department_id')
    .eq('organization_id', params.organizationId)
    .eq('account_id', params.accountId)
    .maybeSingle();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  if (!data) {
    throw new ApiError('Employee not found for user', 404);
  }

  return data;
}

function computeWorkHours(checkIn: string | null, checkOut: string | null) {
  if (!checkIn || !checkOut) {
    return null;
  }

  const diffMs = new Date(checkOut).getTime() - new Date(checkIn).getTime();

  if (diffMs <= 0) {
    return null;
  }

  const hours = diffMs / (1000 * 60 * 60);

  return Math.round(hours * 100) / 100;
}

function computeWorkedMinutes(checkIn: string | null, checkOut: string | null) {
  if (!checkIn || !checkOut) {
    return null;
  }

  const diffMs = new Date(checkOut).getTime() - new Date(checkIn).getTime();

  if (diffMs <= 0) {
    return null;
  }

  return diffMs / (1000 * 60);
}

function deriveAttendanceStatus(params: {
  checkIn: string | null;
  checkOut: string | null;
  shift?: AttendanceStatusShift | null;
  manualStatus?: Database['public']['Enums']['attendance_record_status'];
}) {
  if (params.manualStatus === 'absent') {
    return 'absent' as const;
  }

  const workedMinutes = computeWorkedMinutes(params.checkIn, params.checkOut);
  const requiredMinutes = getRequiredShiftMinutes(params.shift ?? null);

  if (
    workedMinutes !== null &&
    requiredMinutes !== null &&
    workedMinutes < requiredMinutes
  ) {
    return 'absent' as const;
  }

  if (params.manualStatus === 'present') {
    return 'present' as const;
  }

  return params.checkIn ? ('present' as const) : ('absent' as const);
}

function deriveAttendanceDisplayStatus(params: {
  checkIn: string | null;
  checkOut: string | null;
  status: Database['public']['Enums']['attendance_record_status'];
  shift?: AttendanceStatusShift | null;
}) {
  if (params.checkIn && !params.checkOut) {
    return 'in_progress' as const;
  }

  const derivedStatus = deriveAttendanceStatus({
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    shift: params.shift,
  });

  if (derivedStatus === 'absent') {
    return 'absent' as const;
  }

  return params.status;
}

function getRequiredShiftMinutes(shift: AttendanceStatusShift | null) {
  if (!shift) {
    return null;
  }

  const startMinutes = parseTimeToMinutes(shift.start_time);
  const endMinutes = parseTimeToMinutes(shift.end_time);

  if (startMinutes === null || endMinutes === null) {
    return null;
  }

  let scheduledMinutes = endMinutes - startMinutes;

  if (scheduledMinutes <= 0) {
    scheduledMinutes += 24 * 60;
  }

  return Math.max(scheduledMinutes - Math.max(shift.grace_minutes ?? 0, 0), 0);
}

function parseTimeToMinutes(value: string) {
  const [hours, minutes = '0', seconds = '0'] = value.split(':');
  const parsedHours = Number(hours);
  const parsedMinutes = Number(minutes);
  const parsedSeconds = Number(seconds);

  if (
    Number.isNaN(parsedHours) ||
    Number.isNaN(parsedMinutes) ||
    Number.isNaN(parsedSeconds)
  ) {
    return null;
  }

  return parsedHours * 60 + parsedMinutes + parsedSeconds / 60;
}

function normalizeWorkingDays(value: unknown) {
  if (!Array.isArray(value)) {
    throw new ApiError('Working days are required', 400);
  }

  const days = Array.from(new Set(value.map(Number))).sort((a, b) => a - b);

  if (
    days.length === 0 ||
    days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
  ) {
    throw new ApiError('Working days must be valid weekdays', 400);
  }

  return days;
}

async function getAttendanceSettings(params: { organizationId: string }) {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();
  const { data, error } = await supabaseAdmin
    .from('attendance_settings')
    .select('*')
    .eq('organization_id', params.organizationId)
    .maybeSingle();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return (
    data ?? {
      id: '',
      organization_id: params.organizationId,
      working_days: [...DEFAULT_WORKING_DAYS],
      created_at: '',
      updated_at: '',
      created_by: null,
      updated_by: null,
    }
  );
}

function isWorkingDay(date: string, workingDays: Array<number>) {
  const day = new Date(`${date}T00:00:00`).getDay();

  return workingDays.includes(day);
}

export {
  computeWorkHours,
  deriveAttendanceDisplayStatus,
  deriveAttendanceStatus,
  getAttendanceSettings,
  getDateParam,
  getEmployeeForAccount,
  getRoleKeysForUser,
  isWorkingDay,
  normalizeWorkingDays,
  requireAttendanceAdmin,
  toISODateString,
};
