import { ApiError } from '../../../../utils/response-handler';
import {
  type SupabaseAdminClient,
  getHrmsClient,
} from '../../employees/controller.helpers';

type AttendanceLogInsert = Record<string, unknown>;
type AttendanceRecordInsert = Record<string, unknown>;
type AttendanceRecordUpdate = Record<string, unknown>;

type AttendanceAdminUpdateBody = {
  check_in?: string | null;
  check_out?: string | null;
  date?: string | null;
  employee_id?: string | null;
  shift_id?: string | null;
  status?: 'absent' | 'present';
};

async function getShiftForAttendanceStatus(params: {
  organizationId: string;
  shiftId: string | null;
  supabaseAdmin: SupabaseAdminClient;
}) {
  if (!params.shiftId) {
    return null;
  }

  const { data, error } = await getHrmsClient(params.supabaseAdmin)
    .from('shifts')
    .select('start_time, end_time, grace_minutes')
    .eq('workspace_id', params.organizationId)
    .eq('id', params.shiftId)
    .maybeSingle();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return data ?? null;
}

async function assertEmployeeCanHaveAttendanceOnDate(params: {
  date: string;
  employeeId: string;
  organizationId: string;
  supabaseAdmin: SupabaseAdminClient;
}) {
  const { data, error } = await getHrmsClient(params.supabaseAdmin)
    .from('employees')
    .select('id, joining_date')
    .eq('workspace_id', params.organizationId)
    .eq('id', params.employeeId)
    .maybeSingle();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  if (!data) {
    throw new ApiError('Employee not found', 404);
  }

  if (data.joining_date && data.joining_date > params.date) {
    throw new ApiError(
      'Attendance cannot be recorded before employee joining date',
      400,
    );
  }
}

export type {
  AttendanceAdminUpdateBody,
  AttendanceLogInsert,
  AttendanceRecordInsert,
  AttendanceRecordUpdate,
  SupabaseAdminClient,
};
export { assertEmployeeCanHaveAttendanceOnDate, getShiftForAttendanceStatus };
