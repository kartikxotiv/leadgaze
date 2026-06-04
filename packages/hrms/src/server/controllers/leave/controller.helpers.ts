import type {
  EmployeeReportRow,
  LeaveRequestRelationRow,
  LeaveTypeRow,
} from './controller.types';
import { type LeaveContext, getCalendarYear, getEmployeeName } from './utils';

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100;
}

function isRequestInYear(
  request: Pick<LeaveRequestRelationRow, 'from_date'>,
  year: number,
) {
  return getCalendarYear(request.from_date) === year;
}

function sumRequestsByStatus(params: {
  requests: LeaveRequestRelationRow[];
  leaveTypeId: string;
  year: number;
}) {
  const matchingRequests = params.requests.filter(
    (request) =>
      request.leave_type_id === params.leaveTypeId &&
      isRequestInYear(request, params.year),
  );

  return matchingRequests.reduce(
    (result, request) => {
      if (request.status === 'approved') {
        result.approved += request.day_count;
      } else if (request.status === 'pending') {
        result.pending += request.day_count;
      } else if (request.status === 'rejected') {
        result.rejected += request.day_count;
      } else if (request.status === 'cancelled') {
        result.cancelled += request.day_count;
      }

      return result;
    },
    { approved: 0, cancelled: 0, pending: 0, rejected: 0 },
  );
}

function getCarryForwardAmount(params: {
  leaveType: LeaveTypeRow;
  requests: LeaveRequestRelationRow[];
  year: number;
}) {
  if (!params.leaveType.can_carry_forward) {
    return 0;
  }

  const requestYears = params.requests
    .filter((request) => request.leave_type_id === params.leaveType.id)
    .map((request) => getCalendarYear(request.from_date));
  const firstYear = Math.min(params.year, ...requestYears);
  let carriedForward = 0;

  for (let year = firstYear; year < params.year; year += 1) {
    const usage = sumRequestsByStatus({
      leaveTypeId: params.leaveType.id,
      requests: params.requests,
      year,
    });
    const total = (params.leaveType.annual_allocation ?? 0) + carriedForward;

    carriedForward = Math.max(total - usage.approved - usage.pending, 0);
  }

  return roundToTwo(carriedForward);
}

function buildBalances(params: {
  leaveTypes: LeaveTypeRow[];
  requests: LeaveRequestRelationRow[];
  year: number;
}) {
  return params.leaveTypes
    .filter((leaveType) => leaveType.is_active)
    .map((leaveType) => {
      const carriedForward = getCarryForwardAmount({
        leaveType,
        requests: params.requests,
        year: params.year,
      });
      const usage = sumRequestsByStatus({
        leaveTypeId: leaveType.id,
        requests: params.requests,
        year: params.year,
      });
      const total = (leaveType.annual_allocation ?? 0) + carriedForward;

      return {
        approved: roundToTwo(usage.approved),
        available: roundToTwo(
          Math.max(total - usage.approved - usage.pending, 0),
        ),
        cancelled: roundToTwo(usage.cancelled),
        carried_forward: carriedForward,
        leave_type: leaveType,
        pending: roundToTwo(usage.pending),
        rejected: roundToTwo(usage.rejected),
        total: roundToTwo(total),
      };
    });
}

function canViewApprovalQueue(
  context: LeaveContext,
  request: LeaveRequestRelationRow,
) {
  if (!context.permissions.canViewApprovals) {
    return false;
  }

  if (context.permissions.isAdmin || context.permissions.isHr) {
    return true;
  }

  if (context.permissions.isManager) {
    return request.employee?.manager_employee_id === context.employee?.id;
  }

  return true;
}

function canApproveRequest(
  context: LeaveContext,
  request: LeaveRequestRelationRow,
) {
  if (request.status !== 'pending') {
    return false;
  }

  if (!context.permissions.canApprove) {
    return false;
  }

  if (context.permissions.isAdmin || context.permissions.isHr) {
    return true;
  }

  if (context.permissions.isManager) {
    return (
      request.employee?.manager_employee_id === context.employee?.id &&
      !request.leave_type?.requires_hr_approval
    );
  }

  return true;
}

function decorateRequest(
  context: LeaveContext,
  request: LeaveRequestRelationRow,
) {
  return {
    ...request,
    organization_id: request.workspace_id,
    approver_name: request.approver ? getEmployeeName(request.approver) : null,
    can_approve: canApproveRequest(context, request),
    can_cancel:
      Boolean(context.employee?.id) &&
      request.employee_id === context.employee?.id &&
      request.status === 'pending',
    employee_name: getEmployeeName(request.employee ?? undefined),
  };
}

function buildReports(params: {
  employees: EmployeeReportRow[];
  leaveTypes: LeaveTypeRow[];
  requests: LeaveRequestRelationRow[];
  year: number;
}) {
  const yearRequests = params.requests.filter((request) =>
    isRequestInYear(request, params.year),
  );

  const summary = yearRequests.reduce(
    (result, request) => {
      result.total += 1;

      if (request.status === 'approved') {
        result.approved += 1;
      } else if (request.status === 'pending') {
        result.pending += 1;
      } else if (request.status === 'rejected') {
        result.rejected += 1;
      } else if (request.status === 'cancelled') {
        result.cancelled += 1;
      }

      return result;
    },
    { approved: 0, cancelled: 0, pending: 0, rejected: 0, total: 0 },
  );

  const utilizationByType = params.leaveTypes
    .filter((leaveType) => leaveType.is_active)
    .map((leaveType) => {
      const requests = yearRequests.filter(
        (request) => request.leave_type_id === leaveType.id,
      );

      return {
        approved_days: roundToTwo(
          requests.reduce((result, request) => {
            return request.status === 'approved'
              ? result + request.day_count
              : result;
          }, 0),
        ),
        leave_type_code: leaveType.code,
        leave_type_name: leaveType.name,
        pending_days: roundToTwo(
          requests.reduce((result, request) => {
            return request.status === 'pending'
              ? result + request.day_count
              : result;
          }, 0),
        ),
        rejected_days: roundToTwo(
          requests.reduce((result, request) => {
            return request.status === 'rejected'
              ? result + request.day_count
              : result;
          }, 0),
        ),
        total_requests: requests.length,
      };
    });

  const trendByMonth = Array.from(
    yearRequests.reduce(
      (result, request) => {
        const month = request.from_date.slice(0, 7);
        const existing = result.get(month) ?? {
          approved_days: 0,
          month,
          pending_days: 0,
          rejected_days: 0,
          total_requests: 0,
        };

        existing.total_requests += 1;

        if (request.status === 'approved') {
          existing.approved_days += request.day_count;
        } else if (request.status === 'pending') {
          existing.pending_days += request.day_count;
        } else if (request.status === 'rejected') {
          existing.rejected_days += request.day_count;
        }

        result.set(month, existing);
        return result;
      },
      new Map<
        string,
        {
          approved_days: number;
          month: string;
          pending_days: number;
          rejected_days: number;
          total_requests: number;
        }
      >(),
    ),
  )
    .map(([, value]) => ({
      ...value,
      approved_days: roundToTwo(value.approved_days),
      pending_days: roundToTwo(value.pending_days),
      rejected_days: roundToTwo(value.rejected_days),
    }))
    .sort((left, right) => left.month.localeCompare(right.month));

  const departmentWise = Array.from(
    yearRequests.reduce(
      (result, request) => {
        const departmentName =
          request.employee?.department?.name ?? 'Unassigned';
        const existing = result.get(departmentName) ?? {
          approved_days: 0,
          department_name: departmentName,
          pending_requests: 0,
          rejected_requests: 0,
          total_requests: 0,
        };

        existing.total_requests += 1;

        if (request.status === 'approved') {
          existing.approved_days += request.day_count;
        } else if (request.status === 'pending') {
          existing.pending_requests += 1;
        } else if (request.status === 'rejected') {
          existing.rejected_requests += 1;
        }

        result.set(departmentName, existing);
        return result;
      },
      new Map<
        string,
        {
          approved_days: number;
          department_name: string;
          pending_requests: number;
          rejected_requests: number;
          total_requests: number;
        }
      >(),
    ),
  )
    .map(([, value]) => ({
      ...value,
      approved_days: roundToTwo(value.approved_days),
    }))
    .sort((left, right) =>
      left.department_name.localeCompare(right.department_name),
    );

  const balanceReport = params.employees.map((employee) => {
    const balances = buildBalances({
      leaveTypes: params.leaveTypes,
      requests: yearRequests.filter(
        (request) => request.employee_id === employee.id,
      ),
      year: params.year,
    });

    return {
      allocated: roundToTwo(
        balances.reduce((result, balance) => result + balance.total, 0),
      ),
      approved: roundToTwo(
        balances.reduce((result, balance) => result + balance.approved, 0),
      ),
      available: roundToTwo(
        balances.reduce((result, balance) => result + balance.available, 0),
      ),
      department_name: employee.department?.name ?? 'Unassigned',
      employee_code: employee.employee_code,
      employee_id: employee.id,
      employee_name: getEmployeeName(employee),
      pending: roundToTwo(
        balances.reduce((result, balance) => result + balance.pending, 0),
      ),
    };
  });

  return {
    balance_report: balanceReport,
    department_wise: departmentWise,
    summary,
    trend_by_month: trendByMonth,
    utilization_by_type: utilizationByType,
  };
}

export {
  buildBalances,
  buildReports,
  canApproveRequest,
  canViewApprovalQueue,
  decorateRequest,
};
