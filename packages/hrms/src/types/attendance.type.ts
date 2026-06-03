export type Shift = {
  id: string;
  organization_id: string;
  name: string;
  start_time: string;
  end_time: string;
  grace_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AttendanceLog = {
  id: string;
  punch_type: 'in' | 'out';
  punch_time: string;
  source: string | null;
};

export type AttendanceRecordStatus = 'present' | 'absent';
export type AttendanceDisplayStatus = 'present' | 'absent' | 'in_progress';
export type WorkingDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type AttendanceSettings = {
  id: string;
  organization_id: string;
  working_days: Array<WorkingDay>;
  created_at: string;
  updated_at: string;
};

export type AdminAttendanceFilters = {
  date?: string;
  search?: string;
  shiftId?: string;
  status?: AttendanceDisplayStatus;
};

export type AttendanceRecord = {
  id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: AttendanceRecordStatus;
  work_hours: number | null;
  shift_id: string | null;
  shift: Pick<Shift, 'id' | 'name'> | null;
};

export type AttendanceContext = {
  employeeId: string | null;
  isAdmin: boolean;
  organizationId: string;
  roleKeys: Array<string>;
};

export type MyAttendanceResponse = {
  employee: {
    id: string;
    first_name: string;
    last_name: string | null;
    employee_code: string;
    department_id: string | null;
  };
  today: (AttendanceRecord & { shift: Shift | null }) | null;
  recent: Array<AttendanceRecord>;
  logs: Array<AttendanceLog>;
  isWorkingDay: boolean;
  workingDays: Array<WorkingDay>;
};

export type AdminAttendanceRow = {
  employee: {
    id: string;
    employee_code: string;
    first_name: string;
    last_name: string | null;
    work_email: string;
    shift_id: string | null;
    shift: Pick<
      Shift,
      'id' | 'name' | 'start_time' | 'end_time' | 'grace_minutes'
    > | null;
    department: { id: string; name: string; code: string } | null;
  };
  record:
    | (AttendanceRecord & {
        shift: Pick<
          Shift,
          'id' | 'name' | 'start_time' | 'end_time' | 'grace_minutes'
        > | null;
      })
    | null;
  displayStatus: AttendanceDisplayStatus;
};

export type AdminAttendanceResponse = {
  date: string;
  rows: Array<AdminAttendanceRow>;
  shifts: Array<
    Pick<
      Shift,
      'id' | 'name' | 'start_time' | 'end_time' | 'grace_minutes' | 'is_active'
    >
  >;
  isWorkingDay: boolean;
  workingDays: Array<WorkingDay>;
  summary: {
    absent: number;
    inProgress: number;
    present: number;
    total: number;
  };
};

export type ApiSuccessResponse<T> = {
  success: boolean;
  statusCode: number;
  message: string | null;
  data: T;
};
