export type LeaveRequestStatus =
  | 'approved'
  | 'cancelled'
  | 'pending'
  | 'rejected';

export type LeaveType = {
  annual_allocation: number;
  can_carry_forward: boolean;
  code: string;
  created_at: string;
  created_by: string | null;
  description: string | null;
  id: string;
  is_active: boolean;
  name: string;
  organization_id: string;
  requires_hr_approval: boolean;
  updated_at: string;
  updated_by: string | null;
};

export type LeaveHoliday = {
  created_at: string;
  created_by: string | null;
  description: string | null;
  holiday_date: string;
  id: string;
  is_optional: boolean;
  name: string;
  organization_id: string;
  updated_at: string;
  updated_by: string | null;
};

export type LeaveEmployeeSummary = {
  department: {
    code: string;
    id: string;
    name: string;
  } | null;
  employee_code: string;
  first_name: string;
  id: string;
  last_name: string | null;
  manager_employee_id: string | null;
};

export type LeaveApproverSummary = {
  employee_code: string;
  first_name: string;
  id: string;
  last_name: string | null;
};

export type LeaveRequest = {
  approver: LeaveApproverSummary | null;
  approver_employee_id: string | null;
  approver_name: string | null;
  can_approve: boolean;
  can_cancel: boolean;
  created_at: string;
  day_count: number;
  decision_at: string | null;
  decision_note: string | null;
  employee: LeaveEmployeeSummary | null;
  employee_id: string;
  employee_name: string;
  from_date: string;
  id: string;
  leave_type: Pick<
    LeaveType,
    | 'annual_allocation'
    | 'can_carry_forward'
    | 'code'
    | 'id'
    | 'is_active'
    | 'name'
    | 'requires_hr_approval'
  > | null;
  leave_type_id: string;
  organization_id: string;
  reason: string | null;
  status: LeaveRequestStatus;
  to_date: string;
  updated_at: string;
};

export type LeaveBalance = {
  approved: number;
  available: number;
  cancelled: number;
  carried_forward: number;
  leave_type: LeaveType;
  pending: number;
  rejected: number;
  total: number;
};

export type LeavePermissions = {
  canApply: boolean;
  canApprove: boolean;
  canManageHolidays: boolean;
  canManageLeaveTypes: boolean;
  canManageConfiguration: boolean;
  canViewApprovals: boolean;
  canViewHolidays: boolean;
  canViewRequests: boolean;
  canViewReports: boolean;
  isAdmin: boolean;
  isHr: boolean;
  isManager: boolean;
  isMember: boolean;
};

export type LeaveReports = {
  balance_report: Array<{
    allocated: number;
    approved: number;
    available: number;
    department_name: string;
    employee_code: string;
    employee_id: string;
    employee_name: string;
    pending: number;
  }>;
  department_wise: Array<{
    approved_days: number;
    department_name: string;
    pending_requests: number;
    rejected_requests: number;
    total_requests: number;
  }>;
  summary: {
    approved: number;
    cancelled: number;
    pending: number;
    rejected: number;
    total: number;
  };
  trend_by_month: Array<{
    approved_days: number;
    month: string;
    pending_days: number;
    rejected_days: number;
    total_requests: number;
  }>;
  utilization_by_type: Array<{
    approved_days: number;
    leave_type_code: string;
    leave_type_name: string;
    pending_days: number;
    rejected_days: number;
    total_requests: number;
  }>;
};

export type LeaveDashboardResponse = {
  approvalRequests: LeaveRequest[];
  balances: LeaveBalance[];
  employeeId: string | null;
  holidays: LeaveHoliday[];
  leaveTypes: LeaveType[];
  myRequests: LeaveRequest[];
  organizationId: string;
  permissions: LeavePermissions;
  reports: LeaveReports | null;
  roleKeys: string[];
  year: number;
};

export type ApiSuccessResponse<T> = {
  data: T;
  message: string | null;
  statusCode: number;
  success: boolean;
};

export type LeaveRequestCreatePayload = {
  from_date: string;
  leave_type_id: string;
  reason?: string | null;
  to_date: string;
};

export type LeaveRequestActionPayload = {
  action: 'approve' | 'cancel' | 'reject';
  decision_note?: string | null;
};

export type LeaveTypePayload = {
  annual_allocation: number;
  can_carry_forward?: boolean;
  code: string;
  description?: string | null;
  is_active?: boolean;
  name: string;
  requires_hr_approval?: boolean;
};

export type LeaveHolidayPayload = {
  description?: string | null;
  holiday_date: string;
  is_optional?: boolean;
  name: string;
};
