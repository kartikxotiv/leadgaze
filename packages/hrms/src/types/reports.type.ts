import type { PermissionAccessLevel } from './rbac.type';

export type ReportsFilterState = {
  from: string;
  to: string;
  departmentId?: string | null;
  shiftId?: string | null;
  employeeIds?: string[];
};

export type ReportsPermissionSummary = {
  accessLevel: PermissionAccessLevel;
  canExport: boolean;
  canView: boolean;
  employeeId: string | null;
};

export type ReportsOption = {
  id: string;
  label: string;
};

export type ReportsEmployeeOption = ReportsOption & {
  department_id: string | null;
  employee_code: string;
  shift_id: string | null;
};

export type ReportsShiftOption = ReportsOption & {
  end_time: string;
  start_time: string;
};

export type ReportsOptions = {
  departments: ReportsOption[];
  employees: ReportsEmployeeOption[];
  shifts: ReportsShiftOption[];
};

export type ReportMetric = {
  hint: string;
  label: string;
  value: number | string;
};

export type AttendanceDailySummaryRow = {
  attendance_rate: number;
  avg_work_hours: number;
  date: string;
  in_progress: number;
  present: number;
  total_employees: number;
  absent: number;
};

export type AttendanceMonthlySummaryRow = {
  attendance_rate: number;
  avg_work_hours: number;
  month: string;
  total_days: number;
  present_days: number;
  in_progress_days: number;
  absent_days: number;
};

export type AttendanceLateEarlyRow = {
  department_name: string;
  early_count: number;
  early_minutes: number;
  employee_code: string;
  employee_id: string;
  employee_name: string;
  late_count: number;
  late_minutes: number;
  shift_name: string;
};

export type AttendanceOvertimeRow = {
  department_name: string;
  employee_code: string;
  employee_id: string;
  employee_name: string;
  overtime_days: number;
  overtime_hours: number;
  shift_name: string;
};

export type AttendanceShiftWiseRow = {
  absent: number;
  attendance_rate: number;
  avg_work_hours: number;
  in_progress: number;
  overtime_hours: number;
  present: number;
  shift_id: string | null;
  shift_name: string;
};

export type AttendanceReportsData = {
  dailySummary: AttendanceDailySummaryRow[];
  lateEarly: AttendanceLateEarlyRow[];
  metrics: ReportMetric[];
  monthlySummary: AttendanceMonthlySummaryRow[];
  overtime: AttendanceOvertimeRow[];
  shiftWise: AttendanceShiftWiseRow[];
};

export type LeaveBalanceRow = {
  allocated: number;
  approved: number;
  available: number;
  department_name: string;
  employee_code: string;
  employee_id: string;
  employee_name: string;
  pending: number;
};

export type LeaveUtilizationRow = {
  approved_days: number;
  leave_type_code: string;
  leave_type_id: string;
  leave_type_name: string;
  pending_days: number;
  rejected_days: number;
  total_requests: number;
};

export type LeaveTrendRow = {
  approved_days: number;
  month: string;
  pending_days: number;
  rejected_days: number;
  total_requests: number;
};

export type LeaveDepartmentWiseRow = {
  approved_days: number;
  department_id: string | null;
  department_name: string;
  pending_requests: number;
  rejected_requests: number;
  total_requests: number;
};

export type LeaveReportsData = {
  balance: LeaveBalanceRow[];
  departmentWise: LeaveDepartmentWiseRow[];
  metrics: ReportMetric[];
  trend: LeaveTrendRow[];
  utilization: LeaveUtilizationRow[];
};

export type PayrollSummaryRow = {
  employee_count: number;
  employer_contributions: number;
  gross_earnings: number;
  net_pay: number;
  period: string;
  run_id: string;
  status: string;
  total_deductions: number;
};

export type PayrollComponentBreakdownRow = {
  amount: number;
  component_code: string;
  component_id: string;
  component_name: string;
  employee_count: number;
  type: string;
};

export type PayrollDepartmentCostRow = {
  department_id: string | null;
  department_name: string;
  employee_count: number;
  employer_contributions: number;
  gross_earnings: number;
  net_pay: number;
  total_deductions: number;
};

export type PayrollOvertimePayoutRow = {
  amount: number;
  component_name: string;
  department_name: string;
  employee_code: string;
  employee_id: string;
  employee_name: string;
  period: string;
  source: string;
};

export type PayrollBonusArrearRow = {
  amount: number;
  department_name: string;
  effective_date: string;
  employee_code: string;
  employee_id: string;
  employee_name: string;
  item_name: string;
  payable_period: string;
  source_type: string;
  status: string;
};

export type PayrollReportsData = {
  bonusAndArrears: PayrollBonusArrearRow[];
  componentBreakdown: PayrollComponentBreakdownRow[];
  departmentCost: PayrollDepartmentCostRow[];
  metrics: ReportMetric[];
  overtimePayout: PayrollOvertimePayoutRow[];
  payrollSummary: PayrollSummaryRow[];
};

export type CustomWorkforceSnapshotRow = {
  department_name: string;
  employee_code: string;
  employee_id: string;
  employee_name: string;
  late_count: number;
  leave_days: number;
  net_pay: number;
  overtime_hours: number;
  present_days: number;
};

export type CustomReportsData = {
  metrics: ReportMetric[];
  workforceSnapshot: CustomWorkforceSnapshotRow[];
};

export type ReportsDashboardResponse = {
  attendance: AttendanceReportsData;
  custom: CustomReportsData;
  filters: {
    appliedEmployeeCount: number;
    departmentId: string | null;
    employeeIds: string[];
    from: string;
    shiftId: string | null;
    to: string;
    totalAccessibleEmployees: number;
  };
  leave: LeaveReportsData;
  options: ReportsOptions;
  payroll: PayrollReportsData;
  permissions: ReportsPermissionSummary;
};

export type ApiSuccessResponse<T> = {
  data: T;
  message: string | null;
  statusCode: number;
  success: boolean;
};
