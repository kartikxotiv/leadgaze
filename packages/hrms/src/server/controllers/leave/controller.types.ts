type LeaveRequestInsert = Record<string, unknown>;
type LeaveRequestUpdate = Record<string, unknown>;
type LeaveTypeInsert = Record<string, unknown>;
type LeaveTypeUpdate = Record<string, unknown>;
type LeaveHolidayInsert = Record<string, unknown>;
type LeaveHolidayUpdate = Record<string, unknown>;
type LeaveRequestStatus = 'approved' | 'cancelled' | 'pending' | 'rejected';

type LeaveRequestBody = {
  from_date: string;
  leave_type_id: string;
  reason?: string | null;
  to_date: string;
};

type LeaveRequestActionBody = {
  action: 'approve' | 'cancel' | 'reject';
  decision_note?: string | null;
};

type LeaveTypeBody = {
  annual_allocation?: number;
  can_carry_forward?: boolean;
  code?: string;
  description?: string | null;
  is_active?: boolean;
  name?: string;
  requires_hr_approval?: boolean;
};

type LeaveHolidayBody = {
  description?: string | null;
  holiday_date?: string;
  is_optional?: boolean;
  name?: string;
};

type LeaveTypeRow = {
  annual_allocation: number;
  can_carry_forward: boolean;
  code: string;
  created_at: string;
  created_by: string | null;
  description: string | null;
  id: string;
  is_active: boolean;
  name: string;
  organization_id?: string;
  requires_hr_approval: boolean;
  updated_at: string;
  updated_by: string | null;
  workspace_id: string;
};

type LeaveRequestRelationRow = {
  approver: {
    employee_code: string;
    first_name: string;
    id: string;
    last_name: string | null;
  } | null;
  approver_employee_id: string | null;
  created_at: string;
  day_count: number;
  decision_at: string | null;
  decision_note: string | null;
  employee: {
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
  } | null;
  employee_id: string;
  from_date: string;
  id: string;
  leave_type: {
    annual_allocation: number;
    can_carry_forward: boolean;
    code: string;
    id: string;
    is_active: boolean;
    name: string;
    requires_hr_approval: boolean;
  } | null;
  leave_type_id: string;
  organization_id?: string;
  reason: string | null;
  status: LeaveRequestStatus;
  to_date: string;
  updated_at: string;
  workspace_id: string;
};

type EmployeeReportRow = {
  department: {
    code: string;
    id: string;
    name: string;
  } | null;
  employee_code: string;
  first_name: string;
  id: string;
  last_name: string | null;
};

const leaveRequestSelect = `
  id,
  workspace_id,
  employee_id,
  leave_type_id,
  from_date,
  to_date,
  day_count,
  reason,
  status,
  approver_employee_id,
  decision_at,
  decision_note,
  created_at,
  updated_at,
  employee:employees!leave_requests_employee_id_fkey (
    id,
    first_name,
    last_name,
    employee_code,
    manager_employee_id,
    department:departments!employees_department_id_fkey (
      id,
      name,
      code
    )
  ),
  leave_type:leave_types!leave_requests_leave_type_id_fkey (
    id,
    code,
    name,
    annual_allocation,
    can_carry_forward,
    requires_hr_approval,
    is_active
  ),
  approver:employees!leave_requests_approver_employee_id_fkey (
    id,
    first_name,
    last_name,
    employee_code
  )
`;

export type {
  EmployeeReportRow,
  LeaveHolidayBody,
  LeaveHolidayInsert,
  LeaveHolidayUpdate,
  LeaveRequestActionBody,
  LeaveRequestBody,
  LeaveRequestInsert,
  LeaveRequestRelationRow,
  LeaveRequestStatus,
  LeaveRequestUpdate,
  LeaveTypeBody,
  LeaveTypeInsert,
  LeaveTypeRow,
  LeaveTypeUpdate,
};
export { leaveRequestSelect };
