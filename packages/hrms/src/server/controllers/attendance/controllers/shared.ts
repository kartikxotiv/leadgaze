import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import type { Database } from '~/lib/database.types';
import { ApiError } from '~/utils/response-handler';

type AttendanceLogInsert =
  Database['public']['Tables']['attendance_logs']['Insert'];
type AttendanceRecordInsert =
  Database['public']['Tables']['attendance_records']['Insert'];
type AttendanceRecordUpdate =
  Database['public']['Tables']['attendance_records']['Update'];

type AttendanceAdminUpdateBody = {
  check_in?: string | null;
  check_out?: string | null;
  date?: string | null;
  employee_id?: string | null;
  shift_id?: string | null;
  status?: Database['public']['Enums']['attendance_record_status'];
};

type SupabaseAdminClient = ReturnType<
  typeof getSupabaseServerAdminClient<Database>
>;

async function getShiftForAttendanceStatus(params: {
  supabaseAdmin: SupabaseAdminClient;
  organizationId: string;
  shiftId: string | null;
}) {
  if (!params.shiftId) {
    return null;
  }

  const { data, error } = await params.supabaseAdmin
    .from('shifts')
    .select('start_time, end_time, grace_minutes')
    .eq('organization_id', params.organizationId)
    .eq('id', params.shiftId)
    .maybeSingle();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return data ?? null;
}

async function assertEmployeeCanHaveAttendanceOnDate(params: {
  supabaseAdmin: SupabaseAdminClient;
  organizationId: string;
  employeeId: string;
  date: string;
}) {
  const { data, error } = await params.supabaseAdmin
    .from('employees')
    .select('id, joining_date')
    .eq('organization_id', params.organizationId)
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
