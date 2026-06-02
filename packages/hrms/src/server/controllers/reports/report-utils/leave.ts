import type { LeaveReportsData } from '~/types/reports.type';

import {
  createEmployeeSnapshot,
  getDepartmentName,
  getEmployeeName,
  getMonthKey,
  roundNumber,
  toReportMetric,
} from './shared';
import type {
  LeaveRequestRow,
  LeaveTypeRow,
  ReportsEmployeeRow,
} from './types';

export function buildLeaveReports(params: {
  employees: ReportsEmployeeRow[];
  leaveTypes: LeaveTypeRow[];
  requests: LeaveRequestRow[];
}) {
  const balanceMap = new Map<
    string,
    {
      allocated: number;
      approved: number;
      available: number;
      department_name: string;
      employee_code: string;
      employee_id: string;
      employee_name: string;
      pending: number;
    }
  >();
  const utilizationMap = new Map<
    string,
    {
      approved_days: number;
      leave_type_code: string;
      leave_type_id: string;
      leave_type_name: string;
      pending_days: number;
      rejected_days: number;
      total_requests: number;
    }
  >();
  const trendMap = new Map<
    string,
    {
      approved_days: number;
      month: string;
      pending_days: number;
      rejected_days: number;
      total_requests: number;
    }
  >();
  const departmentMap = new Map<
    string,
    {
      approved_days: number;
      department_id: string | null;
      department_name: string;
      pending_requests: number;
      rejected_requests: number;
      total_requests: number;
    }
  >();
  const employeeSnapshot = new Map(
    params.employees.map((employee) => [employee.id, createEmployeeSnapshot()]),
  );
  const allocatedPerEmployee = params.leaveTypes
    .filter((leaveType) => leaveType.is_active !== false)
    .reduce(
      (sum, leaveType) => sum + Number(leaveType.annual_allocation ?? 0),
      0,
    );

  for (const employee of params.employees) {
    balanceMap.set(employee.id, {
      employee_id: employee.id,
      employee_name: getEmployeeName(employee),
      employee_code: employee.employee_code,
      department_name: getDepartmentName(employee),
      allocated: allocatedPerEmployee,
      approved: 0,
      pending: 0,
      available: allocatedPerEmployee,
    });
  }

  for (const request of params.requests) {
    const employeeId = request.employee_id;
    const employeeBalance = balanceMap.get(employeeId);
    const days = Number(request.day_count ?? 0);

    if (employeeBalance) {
      if (request.status === 'approved') {
        employeeBalance.approved += days;
      }

      if (request.status === 'pending') {
        employeeBalance.pending += days;
      }

      employeeBalance.available = Math.max(
        employeeBalance.allocated -
          employeeBalance.approved -
          employeeBalance.pending,
        0,
      );
      balanceMap.set(employeeId, employeeBalance);
    }

    const leaveTypeKey = request.leave_type_id;
    const leaveTypeEntry = utilizationMap.get(leaveTypeKey) ?? {
      leave_type_id: request.leave_type?.id ?? request.leave_type_id,
      leave_type_name: request.leave_type?.name ?? 'Unknown',
      leave_type_code: request.leave_type?.code ?? 'NA',
      approved_days: 0,
      pending_days: 0,
      rejected_days: 0,
      total_requests: 0,
    };

    leaveTypeEntry.total_requests += 1;
    if (request.status === 'approved') {
      leaveTypeEntry.approved_days += days;
    }
    if (request.status === 'pending') {
      leaveTypeEntry.pending_days += days;
    }
    if (request.status === 'rejected') {
      leaveTypeEntry.rejected_days += days;
    }
    utilizationMap.set(leaveTypeKey, leaveTypeEntry);

    const monthKey = getMonthKey(request.from_date);
    const trendEntry = trendMap.get(monthKey) ?? {
      month: monthKey,
      approved_days: 0,
      pending_days: 0,
      rejected_days: 0,
      total_requests: 0,
    };

    trendEntry.total_requests += 1;
    if (request.status === 'approved') {
      trendEntry.approved_days += days;
    }
    if (request.status === 'pending') {
      trendEntry.pending_days += days;
    }
    if (request.status === 'rejected') {
      trendEntry.rejected_days += days;
    }
    trendMap.set(monthKey, trendEntry);

    const departmentKey = request.employee?.department?.id ?? 'unassigned';
    const departmentEntry = departmentMap.get(departmentKey) ?? {
      department_id: request.employee?.department?.id ?? null,
      department_name: request.employee?.department?.name ?? 'Unassigned',
      approved_days: 0,
      pending_requests: 0,
      rejected_requests: 0,
      total_requests: 0,
    };

    departmentEntry.total_requests += 1;
    if (request.status === 'approved') {
      departmentEntry.approved_days += days;
    }
    if (request.status === 'pending') {
      departmentEntry.pending_requests += 1;
    }
    if (request.status === 'rejected') {
      departmentEntry.rejected_requests += 1;
    }
    departmentMap.set(departmentKey, departmentEntry);

    if (request.status === 'approved') {
      const snapshot = employeeSnapshot.get(employeeId);
      if (snapshot) {
        snapshot.leaveDays += days;
      }
    }
  }

  const approvedDays = params.requests
    .filter((request) => request.status === 'approved')
    .reduce((sum, request) => sum + Number(request.day_count ?? 0), 0);
  const pendingDays = params.requests
    .filter((request) => request.status === 'pending')
    .reduce((sum, request) => sum + Number(request.day_count ?? 0), 0);

  return {
    data: {
      metrics: [
        toReportMetric(
          'Employees tracked',
          params.employees.length,
          'Employees included in the leave reporting scope.',
        ),
        toReportMetric(
          'Leave requests',
          params.requests.length,
          'Approved, pending, rejected, and cancelled requests in range.',
        ),
        toReportMetric(
          'Approved leave days',
          roundNumber(approvedDays),
          'Approved leave days across the selected employees.',
        ),
        toReportMetric(
          'Pending leave days',
          roundNumber(pendingDays),
          'Leave days awaiting approval.',
        ),
      ],
      balance: Array.from(balanceMap.values()).sort((left, right) =>
        left.employee_name.localeCompare(right.employee_name),
      ),
      utilization: Array.from(utilizationMap.values()).sort(
        (left, right) => right.approved_days - left.approved_days,
      ),
      trend: Array.from(trendMap.values()).sort((left, right) =>
        left.month.localeCompare(right.month),
      ),
      departmentWise: Array.from(departmentMap.values()).sort(
        (left, right) => right.total_requests - left.total_requests,
      ),
    } satisfies LeaveReportsData,
    employeeSnapshot,
  };
}
