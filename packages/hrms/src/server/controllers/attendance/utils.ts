import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { ApiError } from '../../../utils/response-handler';
import {
  getHrmsClient,
  requireEmployeePermission,
} from '../employees/controller.helpers';

type AttendanceStatusShift = {
  end_time: string;
  grace_minutes: number | null;
  start_time: string;
};

type SupabaseAdminClient = ReturnType<typeof getSupabaseServerAdminClient>;

const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5] as const;

async function getRoleKeysForUser(params: {
  accountId: string;
  organizationId: string;
}) {
  const supabaseAdmin = getSupabaseServerAdminClient();
  const { data, error } = await supabaseAdmin
    .from('workspace_members')
    .select('role:workspace_roles!workspace_members_role_id_fkey(role_key)')
    .eq('workspace_id', params.organizationId)
    .eq('user_id', params.accountId)
    .eq('status', 'accepted')
    .maybeSingle();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  const roleKey = (data as { role?: { role_key?: string } } | null)?.role
    ?.role_key;

  return roleKey ? [roleKey] : [];
}

async function requireAttendanceAdmin(params: {
  accountId: string;
  organizationId: string;
}) {
  const supabaseAdmin = getSupabaseServerAdminClient();

  try {
    await requireEmployeePermission({
      featureKey: 'approve',
      minAccessLevel: 'team',
      moduleKey: 'hrms_attendance',
      supabaseAdmin,
      userId: params.accountId,
      workspaceId: params.organizationId,
    });
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 403) {
      await requireEmployeePermission({
        featureKey: 'create',
        minAccessLevel: 'team',
        moduleKey: 'hrms_attendance',
        supabaseAdmin,
        userId: params.accountId,
        workspaceId: params.organizationId,
      });
      return;
    }

    throw error;
  }
}

async function requireAttendanceLog(params: {
  accountId: string;
  organizationId: string;
}) {
  await requireEmployeePermission({
    featureKey: 'log',
    minAccessLevel: 'own',
    moduleKey: 'hrms_attendance',
    supabaseAdmin: getSupabaseServerAdminClient(),
    userId: params.accountId,
    workspaceId: params.organizationId,
  });
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
  const supabaseAdmin = getSupabaseServerAdminClient();
  const { data, error } = await getHrmsClient(supabaseAdmin)
    .from('employees')
    .select('id, first_name, last_name, employee_code, department_id')
    .eq('workspace_id', params.organizationId)
    .eq('account_id', params.accountId)
    .eq('is_deleted', false)
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
  manualStatus?: 'absent' | 'present';
  shift?: AttendanceStatusShift | null;
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
  shift?: AttendanceStatusShift | null;
  status: 'absent' | 'present';
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
  const supabaseAdmin = getSupabaseServerAdminClient();
  const { data, error } = await getHrmsClient(supabaseAdmin)
    .from('attendance_settings')
    .select('*')
    .eq('workspace_id', params.organizationId)
    .maybeSingle();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return addOrganizationAlias(
    data ?? {
      id: '',
      workspace_id: params.organizationId,
      working_days: [...DEFAULT_WORKING_DAYS],
      created_at: '',
      updated_at: '',
      created_by: null,
      updated_by: null,
    },
  );
}

function isWorkingDay(date: string, workingDays: Array<number>) {
  const day = new Date(`${date}T00:00:00`).getDay();

  return workingDays.includes(day);
}

function addOrganizationAlias<T extends { workspace_id: string }>(item: T) {
  return {
    ...item,
    organization_id: item.workspace_id,
  };
}

export {
  addOrganizationAlias,
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
  requireAttendanceLog,
  toISODateString,
};
