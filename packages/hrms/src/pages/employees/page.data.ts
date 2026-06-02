import type {
  EmployeeListSummary,
  EmployeeOptions,
  EmployeeStatus,
} from '~/types/employee.type';

export const employeesQueryKey = ['employees'] as const;
export const employeeOptionsQueryKey = ['employee-options'] as const;
export const employeePageSize = 10;
export const allEmployeeStatuses = 'all';

export type EmployeeStatusFilter = EmployeeStatus | typeof allEmployeeStatuses;

export const employeeStatusOptions: Array<{
  label: string;
  value: EmployeeStatusFilter;
}> = [
  { label: 'All statuses', value: allEmployeeStatuses },
  { label: 'Invited', value: 'invited' },
  { label: 'Active', value: 'active' },
  { label: 'Probation', value: 'probation' },
  { label: 'Notice Period', value: 'notice_period' },
  { label: 'Inactive', value: 'inactive' },
];

export const emptySummary: EmployeeListSummary = {
  activeCount: 0,
  departmentCoverage: 0,
  invitedCount: 0,
  totalCount: 0,
};

export const emptyEmployeeOptions: EmployeeOptions = {
  departments: [],
  eligibleAccounts: [],
  managers: [],
  roles: [],
  shifts: [],
};
