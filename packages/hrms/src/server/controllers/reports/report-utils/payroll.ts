import type { PayrollReportsData } from '~/types/reports.type';

import {
  createEmployeeSnapshot,
  formatRunPeriod,
  getComponentCode,
  getComponentName,
  getEmployeeName,
  isBonusOrArrearItem,
  isOvertimeComponent,
  roundNumber,
  toReportMetric,
} from './shared';
import type { EmployeePayItemRow, PayrollRunRow } from './types';

export function buildPayrollReports(params: {
  payItems: EmployeePayItemRow[];
  payrollRuns: PayrollRunRow[];
}) {
  const summaryRows: PayrollReportsData['payrollSummary'] = [];
  const componentMap = new Map<
    string,
    {
      amount: number;
      component_code: string;
      component_id: string;
      component_name: string;
      employee_ids: Set<string>;
      type: string;
    }
  >();
  const departmentCostMap = new Map<
    string,
    {
      department_id: string | null;
      department_name: string;
      employee_ids: Set<string>;
      employer_contributions: number;
      gross_earnings: number;
      net_pay: number;
      total_deductions: number;
    }
  >();
  const overtimeRows: PayrollReportsData['overtimePayout'] = [];
  const bonusAndArrears: PayrollReportsData['bonusAndArrears'] = [];
  const employeeSnapshot = new Map<
    string,
    ReturnType<typeof createEmployeeSnapshot>
  >();

  for (const run of params.payrollRuns) {
    const entries = run.payroll_entries ?? [];
    let gross = 0;
    let deductions = 0;
    let employerContributions = 0;
    let net = 0;
    const employeeIds = new Set<string>();

    for (const entry of entries) {
      const employeeId = entry.employee_id;
      const departmentKey = entry.employee?.department?.id ?? 'unassigned';
      const departmentEntry = departmentCostMap.get(departmentKey) ?? {
        department_id: entry.employee?.department?.id ?? null,
        department_name: entry.employee?.department?.name ?? 'Unassigned',
        employee_ids: new Set<string>(),
        gross_earnings: 0,
        total_deductions: 0,
        employer_contributions: 0,
        net_pay: 0,
      };
      const grossEarnings = Number(entry.gross_earnings ?? 0);
      const totalDeductions = Number(entry.total_deductions ?? 0);
      const employerSide = Number(entry.employer_contributions ?? 0);
      const netPay = Number(entry.net_pay ?? 0);

      departmentEntry.employee_ids.add(employeeId);
      departmentEntry.gross_earnings += grossEarnings;
      departmentEntry.total_deductions += totalDeductions;
      departmentEntry.employer_contributions += employerSide;
      departmentEntry.net_pay += netPay;
      departmentCostMap.set(departmentKey, departmentEntry);

      gross += grossEarnings;
      deductions += totalDeductions;
      employerContributions += employerSide;
      net += netPay;
      employeeIds.add(employeeId);

      const snapshot =
        employeeSnapshot.get(employeeId) ?? createEmployeeSnapshot();
      snapshot.netPay += netPay;
      employeeSnapshot.set(employeeId, snapshot);

      for (const item of entry.payroll_entry_items ?? []) {
        const componentId = item.salary_component?.id ?? item.id;
        const componentEntry = componentMap.get(componentId) ?? {
          component_id: componentId,
          component_name: getComponentName(item.salary_component),
          component_code: getComponentCode(item.salary_component),
          type: item.salary_component?.type ?? 'earning',
          amount: 0,
          employee_ids: new Set<string>(),
        };

        componentEntry.amount += Number(item.amount ?? 0);
        componentEntry.employee_ids.add(employeeId);
        componentMap.set(componentId, componentEntry);

        if (
          item.source === 'attendance' ||
          isOvertimeComponent(item.salary_component ?? undefined)
        ) {
          overtimeRows.push({
            employee_id: employeeId,
            employee_name: getEmployeeName(entry.employee ?? undefined),
            employee_code: entry.employee?.employee_code ?? 'NA',
            department_name: entry.employee?.department?.name ?? 'Unassigned',
            period: formatRunPeriod(run.period_start, run.period_end),
            component_name: getComponentName(item.salary_component),
            source: item.source,
            amount: roundNumber(Number(item.amount ?? 0)),
          });
        }
      }
    }

    summaryRows.push({
      run_id: run.id,
      period: formatRunPeriod(run.period_start, run.period_end),
      employee_count: employeeIds.size,
      gross_earnings: roundNumber(gross),
      total_deductions: roundNumber(deductions),
      employer_contributions: roundNumber(employerContributions),
      net_pay: roundNumber(net),
      status: run.status,
    });
  }

  for (const item of params.payItems) {
    if (
      !isBonusOrArrearItem({
        component: item.salary_component,
        sourceType: item.source_type,
      })
    ) {
      continue;
    }

    bonusAndArrears.push({
      employee_id: item.employee_id,
      employee_name: getEmployeeName(item.employee ?? undefined),
      employee_code: item.employee?.employee_code ?? 'NA',
      department_name: item.employee?.department?.name ?? 'Unassigned',
      item_name: getComponentName(item.salary_component),
      source_type: item.source_type,
      amount: roundNumber(Number(item.amount ?? 0)),
      effective_date: item.effective_date,
      payable_period:
        item.payable_in_period_start && item.payable_in_period_end
          ? formatRunPeriod(
              item.payable_in_period_start,
              item.payable_in_period_end,
            )
          : '-',
      status: item.status,
    });
  }

  const totalNet = summaryRows.reduce((sum, row) => sum + row.net_pay, 0);
  const totalGross = summaryRows.reduce(
    (sum, row) => sum + row.gross_earnings,
    0,
  );

  return {
    data: {
      metrics: [
        toReportMetric(
          'Payroll runs',
          summaryRows.length,
          'Payroll cycles overlapping the selected range.',
        ),
        toReportMetric(
          'Net payout',
          roundNumber(totalNet),
          'Net pay calculated across filtered payroll runs.',
        ),
        toReportMetric(
          'Gross earnings',
          roundNumber(totalGross),
          'Gross earnings before deductions.',
        ),
        toReportMetric(
          'Bonus & arrear items',
          bonusAndArrears.length,
          'Variable payouts and retroactive salary adjustments in scope.',
        ),
      ],
      payrollSummary: summaryRows.sort((left, right) =>
        right.period.localeCompare(left.period),
      ),
      componentBreakdown: Array.from(componentMap.values())
        .map((entry) => ({
          component_id: entry.component_id,
          component_name: entry.component_name,
          component_code: entry.component_code,
          type: entry.type,
          amount: roundNumber(entry.amount),
          employee_count: entry.employee_ids.size,
        }))
        .sort((left, right) => right.amount - left.amount),
      departmentCost: Array.from(departmentCostMap.values())
        .map((entry) => ({
          department_id: entry.department_id,
          department_name: entry.department_name,
          employee_count: entry.employee_ids.size,
          gross_earnings: roundNumber(entry.gross_earnings),
          total_deductions: roundNumber(entry.total_deductions),
          employer_contributions: roundNumber(entry.employer_contributions),
          net_pay: roundNumber(entry.net_pay),
        }))
        .sort((left, right) => right.net_pay - left.net_pay),
      overtimePayout: overtimeRows.sort(
        (left, right) => right.amount - left.amount,
      ),
      bonusAndArrears: bonusAndArrears.sort((left, right) =>
        right.effective_date.localeCompare(left.effective_date),
      ),
    } satisfies PayrollReportsData,
    employeeSnapshot,
  };
}
