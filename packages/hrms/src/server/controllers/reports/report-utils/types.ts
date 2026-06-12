export type ReportsDepartmentRow = {
  code: string | null;
  id: string;
  name: string;
};

export type ReportsShiftRow = {
  end_time: string;
  grace_minutes: number | null;
  id: string;
  name: string;
  start_time: string;
};

export type ReportsEmployeeReference = {
  department: ReportsDepartmentRow | null;
  employee_code: string;
  first_name: string;
  id: string;
  last_name: string | null;
};

export type ReportsEmployeeRow = ReportsEmployeeReference & {
  shift: ReportsShiftRow | null;
  shift_id: string | null;
  status?: string | null;
};

export type AttendanceRecordRow = {
  check_in: string | null;
  check_out: string | null;
  date: string;
  employee_id: string;
  shift: ReportsShiftRow | null;
  shift_id: string | null;
  status: 'absent' | 'present';
  work_hours: number | null;
};

export type LeaveTypeRow = {
  annual_allocation: number | null;
  code: string;
  id: string;
  is_active: boolean | null;
  name: string;
};

export type LeaveRequestRow = {
  day_count: number;
  employee: ReportsEmployeeReference | null;
  employee_id: string;
  from_date: string;
  leave_type: {
    annual_allocation: number | null;
    code: string;
    id: string;
    name: string;
  } | null;
  leave_type_id: string;
  status: 'approved' | 'cancelled' | 'pending' | 'rejected';
  to_date: string;
};

export type PayrollRunRow = {
  id: string;
  name: string | null;
  period_end: string;
  period_start: string;
  status: string;
  payroll_entries: Array<{
    employee: ReportsEmployeeReference | null;
    employee_id: string;
    employer_contributions: number | null;
    gross_earnings: number | null;
    id: string;
    net_pay: number | null;
    payroll_entry_items: Array<{
      amount: number | null;
      id: string;
      is_employer_side: boolean | null;
      source: string;
      salary_component: {
        code: string;
        id: string;
        name: string;
        type: string;
      } | null;
    }> | null;
    status: string;
    total_deductions: number | null;
  }> | null;
};

export type EmployeePayItemRow = {
  amount: number | null;
  effective_date: string;
  employee: ReportsEmployeeReference | null;
  employee_id: string;
  payable_in_period_end: string | null;
  payable_in_period_start: string | null;
  salary_component: {
    code: string;
    id: string;
    name: string;
    type: string;
  } | null;
  source_type: string;
  status: string;
};

export type EmployeeSnapshot = {
  lateCount: number;
  leaveDays: number;
  netPay: number;
  overtimeHours: number;
  presentDays: number;
};

export type ReportsFilterInput = {
  departmentId: string | null;
  employeeIds: string[];
  from: string;
  shiftId: string | null;
  to: string;
};
