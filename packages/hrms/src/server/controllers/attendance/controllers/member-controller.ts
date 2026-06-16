import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '../../../../utils/response-handler';
import {
  getHrmsClient,
  getRequiredWorkspaceId,
  getRouteUserId,
} from '../../employees/controller.helpers';
import {
  computeWorkHours,
  deriveAttendanceStatus,
  getAttendanceSettings,
  getEmployeeForAccount,
  isWorkingDay,
  requireAttendanceLog,
  toISODateString,
} from '../utils';
import type { AttendanceLogInsert, AttendanceRecordInsert } from './shared';

const attendanceRecordSelect =
  'id, employee_id, date, check_in, check_out, status, work_hours, shift_id, shift:shifts!attendance_records_shift_id_fkey(id, name, start_time, end_time, grace_minutes)';

const myAttendanceController = catchAsync(async ({ request, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient();
  const hrms = getHrmsClient(supabaseAdmin);
  const userId = getRouteUserId(user);
  const organizationId = await getRequiredWorkspaceId({
    request,
    supabaseAdmin,
    userId,
  });

  await requireAttendanceLog({
    accountId: userId!,
    organizationId,
  });

  const employee = await getEmployeeForAccount({
    accountId: userId!,
    organizationId,
  });
  const searchParams = new URL(request.url).searchParams;
  const date = searchParams.get('date') ?? toISODateString(new Date());

  const { data: todayRecord } = await hrms
    .from('attendance_records')
    .select(attendanceRecordSelect)
    .eq('workspace_id', organizationId)
    .eq('employee_id', employee.id)
    .eq('date', date)
    .maybeSingle();

  const { data: recentRecords, error } = await hrms
    .from('attendance_records')
    .select(
      'id, employee_id, date, check_in, check_out, status, work_hours, shift_id, shift:shifts!attendance_records_shift_id_fkey(id, name)',
    )
    .eq('workspace_id', organizationId)
    .eq('employee_id', employee.id)
    .order('date', { ascending: false })
    .limit(14);

  if (error) {
    throw new ApiError(error.message, 400);
  }

  const { data: todayLogs } = await hrms
    .from('attendance_logs')
    .select('id, punch_type, punch_time, source')
    .eq('workspace_id', organizationId)
    .eq('employee_id', employee.id)
    .gte('punch_time', `${date}T00:00:00.000Z`)
    .lt('punch_time', `${date}T23:59:59.999Z`)
    .order('punch_time', { ascending: false });
  const attendanceSettings = await getAttendanceSettings({ organizationId });

  return successDataResponse('My attendance fetched successfully', {
    employee,
    isWorkingDay: isWorkingDay(date, attendanceSettings.working_days),
    logs: todayLogs ?? [],
    recent: recentRecords ?? [],
    today: todayRecord ?? null,
    workingDays: attendanceSettings.working_days,
  });
});

const checkInController = catchAsync(async ({ request, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient();
  const hrms = getHrmsClient(supabaseAdmin);
  const userId = getRouteUserId(user);
  const organizationId = await getRequiredWorkspaceId({
    request,
    supabaseAdmin,
    userId,
  });

  await requireAttendanceLog({
    accountId: userId!,
    organizationId,
  });

  const employee = await getEmployeeForAccount({
    accountId: userId!,
    organizationId,
  });
  const date = toISODateString(new Date());
  const attendanceSettings = await getAttendanceSettings({ organizationId });

  if (!isWorkingDay(date, attendanceSettings.working_days)) {
    throw new ApiError('Check-in is not available on a non-working day', 400);
  }

  const { data: existingRecord } = await hrms
    .from('attendance_records')
    .select('id, check_in, check_out')
    .eq('workspace_id', organizationId)
    .eq('employee_id', employee.id)
    .eq('date', date)
    .maybeSingle();

  if (existingRecord?.check_in) {
    throw new ApiError('Already checked in for today', 400);
  }

  const now = new Date().toISOString();
  const logPayload: AttendanceLogInsert = {
    workspace_id: organizationId,
    employee_id: employee.id,
    punch_type: 'in',
    punch_time: now,
    source: 'web',
    created_by: userId,
  };

  const { error: logError } = await hrms
    .from('attendance_logs')
    .insert(logPayload);

  if (logError) {
    throw new ApiError(logError.message, 400);
  }

  if (existingRecord?.id) {
    const { error: updateError } = await hrms
      .from('attendance_records')
      .update({
        check_in: now,
        status: 'present',
        updated_by: userId,
      })
      .eq('workspace_id', organizationId)
      .eq('id', existingRecord.id);

    if (updateError) {
      throw new ApiError(updateError.message, 400);
    }
  } else {
    const recordPayload: AttendanceRecordInsert = {
      workspace_id: organizationId,
      employee_id: employee.id,
      date,
      check_in: now,
      status: 'present',
      created_by: userId,
      updated_by: userId,
    };

    const { error: recordError } = await hrms
      .from('attendance_records')
      .insert(recordPayload);

    if (recordError) {
      throw new ApiError(recordError.message, 400);
    }
  }

  return successDataResponse('Checked in successfully', {
    date,
    check_in: now,
  });
});

const checkOutController = catchAsync(async ({ request, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient();
  const hrms = getHrmsClient(supabaseAdmin);
  const userId = getRouteUserId(user);
  const organizationId = await getRequiredWorkspaceId({
    request,
    supabaseAdmin,
    userId,
  });

  await requireAttendanceLog({
    accountId: userId!,
    organizationId,
  });

  const employee = await getEmployeeForAccount({
    accountId: userId!,
    organizationId,
  });
  const date = toISODateString(new Date());

  const { data: record, error: recordError } = await hrms
    .from('attendance_records')
    .select(
      'id, check_in, check_out, shift_id, status, shift:shifts!attendance_records_shift_id_fkey(start_time, end_time, grace_minutes)',
    )
    .eq('workspace_id', organizationId)
    .eq('employee_id', employee.id)
    .eq('date', date)
    .maybeSingle();

  if (recordError) {
    throw new ApiError(recordError.message, 400);
  }

  if (!record?.check_in) {
    throw new ApiError('You must check in before checking out', 400);
  }

  if (record.check_out) {
    throw new ApiError('Already checked out for today', 400);
  }

  const now = new Date().toISOString();
  const logPayload: AttendanceLogInsert = {
    workspace_id: organizationId,
    employee_id: employee.id,
    punch_type: 'out',
    punch_time: now,
    source: 'web',
    created_by: userId,
  };

  const { error: logError } = await hrms
    .from('attendance_logs')
    .insert(logPayload);

  if (logError) {
    throw new ApiError(logError.message, 400);
  }

  const workHours = computeWorkHours(record.check_in, now);
  const status = deriveAttendanceStatus({
    checkIn: record.check_in,
    checkOut: now,
    shift: record.shift,
  });

  const { error: updateError } = await hrms
    .from('attendance_records')
    .update({
      check_out: now,
      work_hours: workHours,
      status,
      updated_by: userId,
    })
    .eq('workspace_id', organizationId)
    .eq('id', record.id);

  if (updateError) {
    throw new ApiError(updateError.message, 400);
  }

  return successDataResponse('Checked out successfully', {
    date,
    check_out: now,
    work_hours: workHours,
  });
});

export { checkInController, checkOutController, myAttendanceController };
