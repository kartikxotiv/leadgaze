import type {
  ReportsEmployeeOption,
  ReportsFilterState,
} from '../types/reports.type';

function toIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getDefaultFilters() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);

  return {
    from: toIsoDate(start),
    to: toIsoDate(today),
    departmentId: null,
    shiftId: null,
    employeeIds: [],
  } satisfies ReportsFilterState;
}

export function filterEmployeeOptions(params: {
  employees: ReportsEmployeeOption[];
  departmentId?: string | null;
  shiftId?: string | null;
}) {
  return params.employees.filter((employee) => {
    if (params.departmentId && employee.department_id !== params.departmentId) {
      return false;
    }

    if (params.shiftId && employee.shift_id !== params.shiftId) {
      return false;
    }

    return true;
  });
}

export function hasInvalidDateRange(filters: ReportsFilterState) {
  return (
    Boolean(filters.from) &&
    Boolean(filters.to) &&
    new Date(filters.from) > new Date(filters.to)
  );
}

export function normalizeFilters(
  filters: ReportsFilterState,
): ReportsFilterState {
  return {
    ...filters,
    employeeIds: filters.employeeIds ?? [],
  };
}
