import type { ReportsDashboardResponse } from '../../../types/reports.type';
import { ReportTableCard, ReportsMetricGrid } from '../page.components';
import { formatMonthLabel, formatNumber } from './report-formatters';

export function ReportsLeaveTab(props: {
  data: ReportsDashboardResponse['leave'];
}) {
  const { data } = props;

  return (
    <>
      <ReportsMetricGrid items={data.metrics} />

      <ReportTableCard
        title="Leave Balance Report"
        description="Allocated, approved, pending, and available leave by employee."
        columns={[
          { key: 'employee', label: 'Employee' },
          { key: 'department', label: 'Department' },
          { key: 'allocated', label: 'Allocated', align: 'right' },
          { key: 'approved', label: 'Approved', align: 'right' },
          { key: 'pending', label: 'Pending', align: 'right' },
          { key: 'available', label: 'Available', align: 'right' },
        ]}
        rows={data.balance.map((row) => ({
          employee: `${row.employee_name} (${row.employee_code})`,
          department: row.department_name,
          allocated: formatNumber(row.allocated),
          approved: formatNumber(row.approved),
          pending: formatNumber(row.pending),
          available: formatNumber(row.available),
        }))}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <ReportTableCard
          title="Leave Utilization"
          columns={[
            { key: 'type', label: 'Leave Type' },
            { key: 'approved', label: 'Approved Days', align: 'right' },
            { key: 'pending', label: 'Pending Days', align: 'right' },
            { key: 'rejected', label: 'Rejected Days', align: 'right' },
            { key: 'requests', label: 'Requests', align: 'right' },
          ]}
          rows={data.utilization.map((row) => ({
            type: row.leave_type_name,
            approved: formatNumber(row.approved_days),
            pending: formatNumber(row.pending_days),
            rejected: formatNumber(row.rejected_days),
            requests: row.total_requests,
          }))}
        />

        <ReportTableCard
          title="Department-wise Leave"
          columns={[
            { key: 'department', label: 'Department' },
            { key: 'approved', label: 'Approved Days', align: 'right' },
            { key: 'pending', label: 'Pending Requests', align: 'right' },
            { key: 'rejected', label: 'Rejected Requests', align: 'right' },
            { key: 'requests', label: 'Total Requests', align: 'right' },
          ]}
          rows={data.departmentWise.map((row) => ({
            department: row.department_name,
            approved: formatNumber(row.approved_days),
            pending: row.pending_requests,
            rejected: row.rejected_requests,
            requests: row.total_requests,
          }))}
        />
      </div>

      <ReportTableCard
        title="Leave Trend Analysis"
        description="Month-wise leave demand trends for the selected period."
        columns={[
          { key: 'month', label: 'Month' },
          { key: 'approved', label: 'Approved Days', align: 'right' },
          { key: 'pending', label: 'Pending Days', align: 'right' },
          { key: 'rejected', label: 'Rejected Days', align: 'right' },
          { key: 'requests', label: 'Requests', align: 'right' },
        ]}
        rows={data.trend.map((row) => ({
          month: formatMonthLabel(row.month),
          approved: formatNumber(row.approved_days),
          pending: formatNumber(row.pending_days),
          rejected: formatNumber(row.rejected_days),
          requests: row.total_requests,
        }))}
      />
    </>
  );
}
