import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import type { Database } from '~/lib/database.types';
import { getCurrentUserOrganizationId } from '~/lib/server/organizations';
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

import {
  computeWorkHours,
  deriveAttendanceDisplayStatus,
  deriveAttendanceStatus,
  getAttendanceSettings,
  isWorkingDay,
  normalizeWorkingDays,
  requireAttendanceAdmin,
  toISODateString,
} from '../utils';
import {
  type AttendanceAdminUpdateBody,
  type AttendanceRecordInsert,
  type AttendanceRecordUpdate,
  assertEmployeeCanHaveAttendanceOnDate,
  getShiftForAttendanceStatus,
} from './shared';

const adminAttendanceController = catchAsync(async ({ request, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();
  const organizationId = await getCurrentUserOrganizationId(user?.id);

  if (!organizationId) {
    throw new ApiError('Organization not found for user', 404);
  }

  await requireAttendanceAdmin({ accountId: user!.id, organizationId });

  const searchParams = new URL(request.url).searchParams;
  const date = parseDateFilter(searchParams.get('date'));
  const search = normalizeFilterValue(searchParams.get('search'));
  const status = parseDisplayStatusFilter(searchParams.get('status'));
  const shiftId = normalizeFilterValue(searchParams.get('shiftId'));

  const [
    { data: employees, error: employeesError },
    { data: records, error: recordsError },
    { data: shifts, error: shiftsError },
  ] = await Promise.all([
    supabaseAdmin
      .from('employees')
      .select(
        'id, employee_code, first_name, last_name, work_email, shift_id, department:departments!employees_department_id_fkey(id, name, code), shift:shifts!employees_shift_id_fkey(id, name, start_time, end_time, grace_minutes)',
      )
      .eq('organization_id', organizationId)
      .neq('status', 'exited')
      .or(`joining_date.is.null,joining_date.lte.${date}`)
      .order('first_name', { ascending: true }),
    supabaseAdmin
      .from('attendance_records')
      .select(
        'id, employee_id, date, check_in, check_out, status, work_hours, shift_id, shift:shifts!attendance_records_shift_id_fkey(id, name, start_time, end_time, grace_minutes)',
      )
      .eq('organization_id', organizationId)
      .eq('date', date),
    supabaseAdmin
      .from('shifts')
      .select('id, name, start_time, end_time, grace_minutes, is_active')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true }),
  ]);
  const attendanceSettings = await getAttendanceSettings({ organizationId });
  const selectedDateIsWorkingDay = isWorkingDay(
    date,
    attendanceSettings.working_days,
  );

  if (employeesError) {
    throw new ApiError(employeesError.message, 400);
  }

  if (recordsError) {
    throw new ApiError(recordsError.message, 400);
  }

  if (shiftsError) {
    throw new ApiError(shiftsError.message, 400);
  }

  const recordByEmployeeId = new Map(
    (records ?? []).map((record) => [record.employee_id, record]),
  );

  const rows = (employees ?? []).map((employee) => {
    const record = recordByEmployeeId.get(employee.id);
    const effectiveShift = record?.shift ?? employee.shift ?? null;
    const normalizedRecord = record
      ? {
          ...record,
          shift_id: record.shift_id ?? employee.shift_id,
          shift: effectiveShift,
        }
      : null;

    const displayStatus = record
      ? deriveAttendanceDisplayStatus({
          checkIn: record.check_in,
          checkOut: record.check_out,
          status: record.status,
          shift: effectiveShift,
        })
      : 'absent';

    return {
      employee,
      record: normalizedRecord,
      displayStatus,
    };
  });

  const filteredRows = rows.filter((row) => {
    const effectiveShift = row.record?.shift ?? row.employee.shift ?? null;
    const effectiveShiftId =
      row.record?.shift_id ?? row.employee.shift_id ?? null;

    if (status && row.displayStatus !== status) {
      return false;
    }

    if (shiftId && effectiveShiftId !== shiftId) {
      return false;
    }

    if (!search) {
      return true;
    }

    const employeeName = [row.employee.first_name, row.employee.last_name]
      .filter(Boolean)
      .join(' ');
    const searchTarget = [
      employeeName,
      row.employee.employee_code,
      row.employee.work_email,
      row.employee.department?.name,
      row.employee.department?.code,
      effectiveShift?.name,
      row.displayStatus.replace('_', ' '),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return search
      .toLowerCase()
      .split(/\s+/)
      .every((part) => searchTarget.includes(part));
  });

  const summary = filteredRows.reduce(
    (result, row) => {
      if (row.displayStatus === 'in_progress') {
        result.inProgress += 1;
        return result;
      }

      if (row.displayStatus === 'present') {
        result.present += 1;
        return result;
      }

      result.absent += 1;
      return result;
    },
    { absent: 0, inProgress: 0, present: 0, total: filteredRows.length },
  );

  return successDataResponse('Attendance fetched successfully', {
    date,
    isWorkingDay: selectedDateIsWorkingDay,
    rows: filteredRows,
    shifts: shifts ?? [],
    summary,
    workingDays: attendanceSettings.working_days,
  });
});

function normalizeFilterValue(value: string | null) {
  const normalizedValue = value?.trim();

  return normalizedValue || null;
}

function parseDateFilter(value: string | null) {
  const normalizedValue = normalizeFilterValue(value);

  if (!normalizedValue) {
    return toISODateString(new Date());
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    throw new ApiError('Invalid attendance date', 400);
  }

  return normalizedValue;
}

function parseDisplayStatusFilter(value: string | null) {
  const normalizedValue = normalizeFilterValue(value);

  if (
    normalizedValue === 'present' ||
    normalizedValue === 'absent' ||
    normalizedValue === 'in_progress'
  ) {
    return normalizedValue;
  }

  return null;
}

const adminUpdateRecordController = catchAsync(
  async ({ body, params, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient<Database>();
    const organizationId = await getCurrentUserOrganizationId(user?.id);
    const updateBody = body as AttendanceAdminUpdateBody;
    const recordId = params?.recordId;

    if (!organizationId) {
      throw new ApiError('Organization not found for user', 404);
    }

    await requireAttendanceAdmin({ accountId: user!.id, organizationId });

    if (!recordId) {
      throw new ApiError('Record id is required', 400);
    }

    const { data: existingRecord, error: existingRecordError } =
      await supabaseAdmin
        .from('attendance_records')
        .select('id, employee_id, date, check_in, check_out, shift_id, status')
        .eq('organization_id', organizationId)
        .eq('id', recordId)
        .maybeSingle();

    if (existingRecordError) {
      throw new ApiError(existingRecordError.message, 400);
    }

    if (!existingRecord) {
      throw new ApiError('Attendance record not found', 404);
    }

    await assertEmployeeCanHaveAttendanceOnDate({
      supabaseAdmin,
      organizationId,
      employeeId: existingRecord.employee_id,
      date: existingRecord.date,
    });
    const attendanceSettings = await getAttendanceSettings({ organizationId });

    if (!isWorkingDay(existingRecord.date, attendanceSettings.working_days)) {
      throw new ApiError(
        'Attendance cannot be recorded on a non-working day',
        400,
      );
    }

    const nextCheckIn =
      'check_in' in updateBody
        ? (updateBody.check_in ?? null)
        : existingRecord.check_in;
    const nextCheckOut =
      'check_out' in updateBody
        ? (updateBody.check_out ?? null)
        : existingRecord.check_out;
    const nextShiftId =
      'shift_id' in updateBody
        ? (updateBody.shift_id ?? null)
        : existingRecord.shift_id;
    const nextShift = await getShiftForAttendanceStatus({
      supabaseAdmin,
      organizationId,
      shiftId: nextShiftId,
    });
    const nextWorkHours = computeWorkHours(nextCheckIn, nextCheckOut);
    const nextStatus = deriveAttendanceStatus({
      checkIn: nextCheckIn,
      checkOut: nextCheckOut,
      shift: nextShift,
      manualStatus: updateBody.status,
    });

    const payload: AttendanceRecordUpdate = {
      check_in: 'check_in' in updateBody ? nextCheckIn : undefined,
      check_out: 'check_out' in updateBody ? nextCheckOut : undefined,
      shift_id: 'shift_id' in updateBody ? nextShiftId : undefined,
      status: nextStatus,
      work_hours: nextWorkHours,
      updated_by: user?.id,
    };

    const { data, error } = await supabaseAdmin
      .from('attendance_records')
      .update(payload)
      .eq('organization_id', organizationId)
      .eq('id', recordId)
      .select(
        'id, employee_id, date, check_in, check_out, status, work_hours, shift_id, shift:shifts!attendance_records_shift_id_fkey(id, name, start_time, end_time, grace_minutes)',
      )
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse('Attendance record updated successfully', data);
  },
);

const adminUpsertRecordController = catchAsync(async ({ body, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();
  const organizationId = await getCurrentUserOrganizationId(user?.id);
  const upsertBody = body as AttendanceAdminUpdateBody;

  if (!organizationId) {
    throw new ApiError('Organization not found for user', 404);
  }

  const employeeId = upsertBody.employee_id;
  const date = upsertBody.date ?? toISODateString(new Date());

  if (!employeeId) {
    throw new ApiError('Employee id is required', 400);
  }

  await requireAttendanceAdmin({ accountId: user!.id, organizationId });

  const { data: employee, error: employeeError } = await supabaseAdmin
    .from('employees')
    .select('id, joining_date')
    .eq('organization_id', organizationId)
    .eq('id', employeeId)
    .maybeSingle();

  if (employeeError) {
    throw new ApiError(employeeError.message, 400);
  }

  if (!employee) {
    throw new ApiError('Employee not found', 404);
  }

  if (employee.joining_date && employee.joining_date > date) {
    throw new ApiError(
      'Attendance cannot be recorded before employee joining date',
      400,
    );
  }
  const attendanceSettings = await getAttendanceSettings({ organizationId });

  if (!isWorkingDay(date, attendanceSettings.working_days)) {
    throw new ApiError(
      'Attendance cannot be recorded on a non-working day',
      400,
    );
  }

  const checkIn = upsertBody.check_in ?? null;
  const checkOut = upsertBody.check_out ?? null;
  const shiftId = upsertBody.shift_id ?? null;
  const shift = await getShiftForAttendanceStatus({
    supabaseAdmin,
    organizationId,
    shiftId,
  });
  const workHours = computeWorkHours(checkIn, checkOut);
  const status = deriveAttendanceStatus({
    checkIn,
    checkOut,
    shift,
    manualStatus: upsertBody.status,
  });

  const payload: AttendanceRecordInsert = {
    organization_id: organizationId,
    employee_id: employeeId,
    date,
    check_in: checkIn,
    check_out: checkOut,
    status,
    shift_id: shiftId,
    work_hours: workHours,
    created_by: user?.id,
    updated_by: user?.id,
  };

  const { data, error } = await supabaseAdmin
    .from('attendance_records')
    .upsert(payload, {
      onConflict: 'organization_id,employee_id,date',
    })
    .select(
      'id, employee_id, date, check_in, check_out, status, work_hours, shift_id, shift:shifts!attendance_records_shift_id_fkey(id, name, start_time, end_time, grace_minutes)',
    )
    .single();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse('Attendance record saved successfully', data);
});

const getWorkingDaysController = catchAsync(async ({ user }) => {
  const organizationId = await getCurrentUserOrganizationId(user?.id);

  if (!organizationId) {
    throw new ApiError('Organization not found for user', 404);
  }

  await requireAttendanceAdmin({ accountId: user!.id, organizationId });

  const settings = await getAttendanceSettings({ organizationId });

  return successDataResponse('Working days fetched successfully', settings);
});

const updateWorkingDaysController = catchAsync(async ({ body, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();
  const organizationId = await getCurrentUserOrganizationId(user?.id);

  if (!organizationId) {
    throw new ApiError('Organization not found for user', 404);
  }

  await requireAttendanceAdmin({ accountId: user!.id, organizationId });

  const workingDays = normalizeWorkingDays(
    (body as { working_days?: unknown }).working_days,
  );

  const { data, error } = await supabaseAdmin
    .from('attendance_settings')
    .upsert(
      {
        organization_id: organizationId,
        working_days: workingDays,
        created_by: user?.id,
        updated_by: user?.id,
      },
      { onConflict: 'organization_id' },
    )
    .select('*')
    .single();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse('Working days updated successfully', data);
});

export {
  adminAttendanceController,
  adminUpsertRecordController,
  adminUpdateRecordController,
  getWorkingDaysController,
  updateWorkingDaysController,
};
