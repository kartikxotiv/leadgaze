import type { ReportsDashboardResponse } from '../../../types/reports.type';
import {
  ReportTableCard,
  ReportsMetricGrid,
  ReportsStatusBadge,
} from '../page.components';
import { formatCurrency } from './report-formatters';

export function ReportsPayrollTab(props: {
  data: ReportsDashboardResponse['payroll'];
}) {
  const { data } = props;

  return (
    <>
      <ReportsMetricGrid items={data.metrics} />

      <ReportTableCard
        title="Payroll Summary Report"
        description="Run-wise payroll totals across the selected period."
        columns={[
          { key: 'period', label: 'Period' },
          { key: 'employees', label: 'Employees', align: 'right' },
          { key: 'gross', label: 'Gross Earnings', align: 'right' },
          { key: 'deductions', label: 'Deductions', align: 'right' },
          { key: 'employer', label: 'Employer Contributions', align: 'right' },
          { key: 'net', label: 'Net Pay', align: 'right' },
          { key: 'status', label: 'Status' },
        ]}
        rows={data.payrollSummary.map((row) => ({
          period: row.period,
          employees: row.employee_count,
          gross: formatCurrency(row.gross_earnings),
          deductions: formatCurrency(row.total_deductions),
          employer: formatCurrency(row.employer_contributions),
          net: formatCurrency(row.net_pay),
          status: <ReportsStatusBadge label={row.status} />,
        }))}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <ReportTableCard
          title="Salary Component Breakdown"
          columns={[
            { key: 'component', label: 'Component' },
            { key: 'code', label: 'Code' },
            { key: 'type', label: 'Type' },
            { key: 'employees', label: 'Employees', align: 'right' },
            { key: 'amount', label: 'Amount', align: 'right' },
          ]}
          rows={data.componentBreakdown.map((row) => ({
            component: row.component_name,
            code: row.component_code,
            type: row.type,
            employees: row.employee_count,
            amount: formatCurrency(row.amount),
          }))}
        />

        <ReportTableCard
          title="Department-wise Payroll Cost"
          columns={[
            { key: 'department', label: 'Department' },
            { key: 'employees', label: 'Employees', align: 'right' },
            { key: 'gross', label: 'Gross', align: 'right' },
            { key: 'deductions', label: 'Deductions', align: 'right' },
            { key: 'employer', label: 'Employer', align: 'right' },
            { key: 'net', label: 'Net Pay', align: 'right' },
          ]}
          rows={data.departmentCost.map((row) => ({
            department: row.department_name,
            employees: row.employee_count,
            gross: formatCurrency(row.gross_earnings),
            deductions: formatCurrency(row.total_deductions),
            employer: formatCurrency(row.employer_contributions),
            net: formatCurrency(row.net_pay),
          }))}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ReportTableCard
          title="Overtime Payout Report"
          columns={[
            { key: 'employee', label: 'Employee' },
            { key: 'department', label: 'Department' },
            { key: 'period', label: 'Period' },
            { key: 'component', label: 'Component' },
            { key: 'source', label: 'Source' },
            { key: 'amount', label: 'Amount', align: 'right' },
          ]}
          rows={data.overtimePayout.map((row) => ({
            employee: `${row.employee_name} (${row.employee_code})`,
            department: row.department_name,
            period: row.period,
            component: row.component_name,
            source: row.source,
            amount: formatCurrency(row.amount),
          }))}
        />

        <ReportTableCard
          title="Arrears & Bonus Report"
          columns={[
            { key: 'employee', label: 'Employee' },
            { key: 'item', label: 'Item' },
            { key: 'source', label: 'Source' },
            { key: 'amount', label: 'Amount', align: 'right' },
            { key: 'effective', label: 'Effective Date' },
            { key: 'period', label: 'Payable Period' },
            { key: 'status', label: 'Status' },
          ]}
          rows={data.bonusAndArrears.map((row) => ({
            employee: `${row.employee_name} (${row.employee_code})`,
            item: row.item_name,
            source: row.source_type,
            amount: formatCurrency(row.amount),
            effective: row.effective_date,
            period: row.payable_period,
            status: <ReportsStatusBadge label={row.status} />,
          }))}
        />
      </div>
    </>
  );
}
