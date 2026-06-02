export type EmployeeStatus =
  | 'invited'
  | 'active'
  | 'probation'
  | 'notice_period'
  | 'inactive'
  | 'exited';

export type EmployeeEmploymentType =
  | 'full_time'
  | 'part_time'
  | 'contract'
  | 'intern';

export type EmployeeAccount = {
  id: string;
  name: string;
  email: string | null;
};

export type EmployeeRole = {
  id: string;
  role_name: string;
  role_key: string;
};

export type EmployeeDepartment = {
  id: string;
  name: string;
  code: string;
};

export type EmployeeShift = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  grace_minutes: number;
  is_active: boolean;
};

export type EmployeeManager = {
  id: string;
  first_name: string;
  last_name: string | null;
  employee_code: string;
};

export type Employee = {
  id: string;
  organization_id: string;
  account_id: string | null;
  department_id: string | null;
  shift_id: string | null;
  employee_code: string;
  first_name: string;
  last_name: string | null;
  work_email: string;
  phone: string | null;
  designation: string | null;
  joining_date: string | null;
  employment_type: EmployeeEmploymentType;
  status: EmployeeStatus;
  invited_at: string | null;
  manager_employee_id: string | null;
  created_at: string;
  updated_at: string;
  manager: EmployeeManager | null;
  account: EmployeeAccount | null;
  department: EmployeeDepartment | null;
  shift: EmployeeShift | null;
  role_id: string | null;
};

export type EmployeeFormPayload = {
  account_id?: string | null;
  department_id?: string | null;
  shift_id?: string | null;
  designation?: string | null;
  employee_code: string;
  employment_type?: EmployeeEmploymentType;
  first_name: string;
  invite_if_missing?: boolean;
  joining_date: string;
  last_name?: string | null;
  manager_employee_id?: string | null;
  phone?: string | null;
  role_id?: string | null;
  status?: EmployeeStatus;
  work_email: string;
};

export type EmployeeOptions = {
  departments: Array<EmployeeDepartment>;
  eligibleAccounts: Array<EmployeeAccount>;
  roles: Array<EmployeeRole>;
  shifts: Array<Pick<EmployeeShift, 'id' | 'name' | 'is_active'>>;
  managers: Array<{
    id: string;
    name: string;
    employee_code: string;
  }>;
};

export type EmployeeListPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type EmployeeListSummary = {
  activeCount: number;
  departmentCoverage: number;
  invitedCount: number;
  totalCount: number;
};

export type EmployeeListData = {
  employees: Array<Employee>;
  pagination: EmployeeListPagination;
  summary: EmployeeListSummary;
};

export type ListEmployeesParams = {
  includeInvited?: boolean;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: EmployeeStatus;
};

export type ApiSuccessResponse<T> = {
  success: boolean;
  statusCode: number;
  message: string | null;
  data: T;
};
