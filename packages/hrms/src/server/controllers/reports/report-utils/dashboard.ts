import type {
  CustomReportsData,
  PayrollReportsData,
  ReportsDashboardResponse,
  ReportsPermissionSummary,
} from '../../../../types/reports.type';
import {
  getDepartmentName,
  getEmployeeName,
  roundNumber,
  toReportMetric,
} from './shared';
import type { EmployeeSnapshot, ReportsEmployeeRow } from './types';

function buildCustomReports(params: {
  attendanceSnapshot: Map<string, EmployeeSnapshot>;
  employees: ReportsEmployeeRow[];
  leaveSnapshot: Map<string, EmployeeSnapshot>;
  payrollSnapshot: Map<string, EmployeeSnapshot>;
}) {
  const workforceSnapshot = params.employees
    .map((employee) => {
      const attendanceSnapshot = params.attendanceSnapshot.get(employee.id);
      const leaveSnapshot = params.leaveSnapshot.get(employee.id);
      const payrollSnapshot = params.payrollSnapshot.get(employee.id);

      return {
        employee_id: employee.id,
        employee_name: getEmployeeName(employee),
        employee_code: employee.employee_code,
        department_name: getDepartmentName(employee),
        present_days: attendanceSnapshot?.presentDays ?? 0,
        late_count: attendanceSnapshot?.lateCount ?? 0,
        overtime_hours: roundNumber(attendanceSnapshot?.overtimeHours ?? 0),
        leave_days: roundNumber(leaveSnapshot?.leaveDays ?? 0),
        net_pay: roundNumber(payrollSnapshot?.netPay ?? 0),
      };
    })
    .sort((left, right) =>
      left.employee_name.localeCompare(right.employee_name),
    );

  const totalNetPay = workforceSnapshot.reduce(
    (sum, row) => sum + row.net_pay,
    0,
  );
  const totalLeaveDays = workforceSnapshot.reduce(
    (sum, row) => sum + row.leave_days,
    0,
  );

  return {
    metrics: [
      toReportMetric(
        'Employees in custom scope',
        workforceSnapshot.length,
        'Employees included after applying the current filters.',
      ),
      toReportMetric(
        'Present days',
        workforceSnapshot.reduce((sum, row) => sum + row.present_days, 0),
        'Employee attendance days across the selected range.',
      ),
      toReportMetric(
        'Leave days',
        roundNumber(totalLeaveDays),
        'Approved leave days for the current custom report scope.',
      ),
      toReportMetric(
        'Net pay in range',
        roundNumber(totalNetPay),
        'Payroll net pay resolved for the filtered employees and periods.',
      ),
    ],
    workforceSnapshot,
  } satisfies CustomReportsData;
}

export function buildReportsDashboardResponse(params: {
  attendance: ReportsDashboardResponse['attendance'];
  attendanceSnapshot: Map<string, EmployeeSnapshot>;
  customEmployees: ReportsEmployeeRow[];
  filters: ReportsDashboardResponse['filters'];
  leave: ReportsDashboardResponse['leave'];
  leaveSnapshot: Map<string, EmployeeSnapshot>;
  options: ReportsDashboardResponse['options'];
  payroll: PayrollReportsData;
  payrollSnapshot: Map<string, EmployeeSnapshot>;
  permissions: ReportsPermissionSummary;
}) {
  return {
    attendance: params.attendance,
    leave: params.leave,
    payroll: params.payroll,
    custom: buildCustomReports({
      employees: params.customEmployees,
      attendanceSnapshot: params.attendanceSnapshot,
      leaveSnapshot: params.leaveSnapshot,
      payrollSnapshot: params.payrollSnapshot,
    }),
    filters: params.filters,
    options: params.options,
    permissions: params.permissions,
  } satisfies ReportsDashboardResponse;
}
