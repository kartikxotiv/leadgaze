import type {
  Employee,
  EmployeeEmploymentType,
  EmployeeFormPayload,
  EmployeeStatus,
} from '../../types/employee.type';

type EmployeeAssignmentMode = 'existing' | 'invite';

type EmployeeFormState = EmployeeFormPayload & {
  assignmentMode: EmployeeAssignmentMode;
};

const EMPTY_FORM: EmployeeFormState = {
  account_id: null,
  assignmentMode: 'invite',
  department_id: null,
  shift_id: null,
  designation: '',
  employee_code: '',
  employment_type: 'full_time',
  first_name: '',
  invite_if_missing: false,
  joining_date: '',
  last_name: '',
  manager_employee_id: null,
  phone: '',
  role_id: null,
  status: 'active',
  work_email: '',
};

const employmentTypeLabels: Record<EmployeeEmploymentType, string> = {
  contract: 'Contract',
  full_time: 'Full Time',
  intern: 'Intern',
  part_time: 'Part Time',
};

const statusLabels: Record<EmployeeStatus, string> = {
  active: 'Active',
  exited: 'Exited',
  inactive: 'Inactive',
  invited: 'Invited',
  notice_period: 'Notice Period',
  probation: 'Probation',
};

function createEmployeeFormState(
  employee?: Employee | null,
): EmployeeFormState {
  if (!employee) {
    return EMPTY_FORM;
  }

  return {
    account_id: employee.account_id,
    assignmentMode: employee.account_id ? 'existing' : 'invite',
    department_id: employee.department_id,
    shift_id: employee.shift_id,
    designation: employee.designation ?? '',
    employee_code: employee.employee_code,
    employment_type: employee.employment_type,
    first_name: employee.first_name,
    invite_if_missing: false,
    joining_date: employee.joining_date ?? '',
    last_name: employee.last_name ?? '',
    manager_employee_id: employee.manager_employee_id,
    phone: employee.phone ?? '',
    role_id: employee.role_id ?? null,
    status: employee.status,
    work_email: employee.work_email,
  };
}

function buildEmployeePayload(form: EmployeeFormState): EmployeeFormPayload {
  return {
    account_id: form.assignmentMode === 'existing' ? form.account_id : null,
    department_id: form.department_id || null,
    shift_id: form.shift_id || null,
    designation: form.designation?.trim() || null,
    employee_code: form.employee_code.trim().toUpperCase(),
    employment_type: form.employment_type,
    first_name: form.first_name.trim(),
    invite_if_missing: form.assignmentMode === 'invite',
    joining_date: form.joining_date,
    last_name: form.last_name?.trim() || null,
    manager_employee_id: form.manager_employee_id || null,
    phone: form.phone?.trim() || null,
    role_id: form.role_id || null,
    status: form.assignmentMode === 'invite' ? undefined : form.status,
    work_email: form.work_email.trim().toLowerCase(),
  };
}

export {
  buildEmployeePayload,
  createEmployeeFormState,
  EMPTY_FORM,
  employmentTypeLabels,
  statusLabels,
};
export type { EmployeeFormState };
