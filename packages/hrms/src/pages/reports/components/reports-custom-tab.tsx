import type { ReportsDashboardResponse } from '../../../types/reports.type';
import { ReportTableCard, ReportsMetricGrid } from '../page.components';
import { formatCurrency, formatNumber } from './report-formatters';

export function ReportsCustomTab(props: {
  data: ReportsDashboardResponse['custom'];
}) {
  const { data } = props;

  return (
    <>
      <ReportsMetricGrid items={data.metrics} />

      <ReportTableCard
        title="Custom Workforce Snapshot"
        description="A combined employee-level report using the active date range and employee filters."
        columns={[
          { key: 'employee', label: 'Employee' },
          { key: 'department', label: 'Department' },
          { key: 'present', label: 'Present Days', align: 'right' },
          { key: 'late', label: 'Late Count', align: 'right' },
          { key: 'overtime', label: 'Overtime Hours', align: 'right' },
          { key: 'leave', label: 'Leave Days', align: 'right' },
          { key: 'net', label: 'Net Pay', align: 'right' },
        ]}
        rows={data.workforceSnapshot.map((row) => ({
          employee: `${row.employee_name} (${row.employee_code})`,
          department: row.department_name,
          present: row.present_days,
          late: row.late_count,
          overtime: formatNumber(row.overtime_hours),
          leave: formatNumber(row.leave_days),
          net: formatCurrency(row.net_pay),
        }))}
      />
    </>
  );
}
