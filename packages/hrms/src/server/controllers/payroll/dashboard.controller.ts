/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';
import { getPayrollContext } from './payroll-context';
import {
  formatPayrollEmployeeName,
  formatPayrollRunPeriod,
  isAssignmentEligibleForPayrollRun,
} from './utils';

export const listPayrollDashboardController = catchAsync(
  async ({ request, user }) => {
    const { hrms, userId, workspaceId } = await getPayrollContext({
      featureKey: 'view',
      minAccessLevel: 'own',
      request,
      user,
    });

    const [
      { data: salaryStructures, error: salaryStructuresError },
      { data: assignmentMetricsRows, error: assignmentMetricsError },
      { data: employeeAssignments, error: employeeAssignmentsError },
      { data: employeePayItems, error: employeePayItemsError },
      { data: payrollRuns, error: payrollRunsError },
      { data: payrollEntries, error: payrollEntriesError },
      { data: payslips, error: payslipsError },
    ] = await Promise.all([
      hrms
        .from('salary_structures')
        .select('id, name, description, currency_code, is_active')
        .eq('workspace_id', workspaceId)
        .order('name', { ascending: true }),
      hrms
        .from('employee_compensation_assignments')
        .select(
          'id, employee_id, effective_from, effective_to, status, is_primary',
        )
        .eq('workspace_id', workspaceId),
      hrms
        .from('employee_compensation_assignments')
        .select(
          `id, employee_id, salary_structure_id, assignment_type, pay_frequency, annual_ctc, monthly_gross, effective_from, effective_to, notes, status, employee:employees(first_name, last_name)`,
        )
        .eq('workspace_id', workspaceId)
        .order('effective_from', { ascending: false })
        .limit(10),
      hrms
        .from('employee_pay_items')
        .select(
          `id, employee_id, salary_component_id, notes, employee:employees(first_name, last_name), salary_component:salary_components(name), amount, effective_date, status`,
        )
        .eq('workspace_id', workspaceId)
        .order('effective_date', { ascending: false })
        .limit(10),
      hrms
        .from('payroll_runs')
        .select(
          `id, name, period_start, period_end, payment_date, status,
        payroll_entries(
          id,
          employee_id,
          gross_earnings,
          total_deductions,
          net_pay,
          status,
          employee:employees(first_name, last_name),
          payroll_entry_items(
            id,
            amount,
            source,
            is_employer_side,
            salary_component:salary_components(name, type)
          )
        )`,
        )
        .eq('workspace_id', workspaceId)
        .order('period_start', { ascending: false })
        .limit(5),
      hrms
        .from('payroll_entries')
        .select(
          `employee:employees(first_name, last_name), gross_earnings, total_deductions, net_pay, status`,
        )
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(5),
      hrms
        .from('payslips')
        .select(
          `employee:employees(first_name, last_name), payroll_run:payroll_runs(period_start, period_end), gross_salary, deductions, net_salary, status`,
        )
        .eq('workspace_id', workspaceId)
        .order('published_at', { ascending: false })
        .limit(5),
    ]);

    if (salaryStructuresError) {
      throw new ApiError(salaryStructuresError.message, 400);
    }

    if (employeeAssignmentsError) {
      throw new ApiError(employeeAssignmentsError.message, 400);
    }

    if (assignmentMetricsError) {
      throw new ApiError(assignmentMetricsError.message, 400);
    }

    if (employeePayItemsError) {
      throw new ApiError(employeePayItemsError.message, 400);
    }

    if (payrollRunsError) {
      throw new ApiError(payrollRunsError.message, 400);
    }

    if (payrollEntriesError) {
      throw new ApiError(payrollEntriesError.message, 400);
    }

    if (payslipsError) {
      throw new ApiError(payslipsError.message, 400);
    }

    return successDataResponse('Payroll dashboard fetched successfully', {
      metrics: {
        activeAssignments:
          assignmentMetricsRows?.filter(
            (item: any) => item.is_primary && item.status === 'active',
          ).length ?? 0,
        openPayItems: employeePayItems?.length ?? 0,
        currentRunWindow:
          payrollRuns?.[0] &&
          `${new Date(payrollRuns[0].period_start).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })} - ${new Date(payrollRuns[0].period_end).toLocaleDateString(
            'en-IN',
            {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            },
          )}`,
        publishedPayslips: payslips?.length ?? 0,
      },
      salaryStructures:
        salaryStructures?.map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          currency_code: item.currency_code,
          is_active: item.is_active,
        })) ?? [],
      employeeAssignments:
        employeeAssignments?.map((item: any) => ({
          id: item.id,
          employee_id: item.employee_id,
          salary_structure_id: item.salary_structure_id,
          employee: formatPayrollEmployeeName(item.employee),
          assignment: item.assignment_type,
          assignment_type: item.assignment_type,
          pay_frequency: item.pay_frequency,
          annual_ctc: item.annual_ctc,
          monthly_gross: item.monthly_gross,
          effective_from: item.effective_from,
          effective_to: item.effective_to,
          notes: item.notes,
          period: item.effective_to
            ? `${new Date(item.effective_from).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })} - ${new Date(item.effective_to).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}`
            : `${new Date(item.effective_from).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })} onward`,
          status: item.status,
        })) ?? [],
      payItems:
        employeePayItems?.map((item: any) => ({
          id: item.id,
          employee_id: item.employee_id,
          salary_component_id: item.salary_component_id,
          employee: formatPayrollEmployeeName(item.employee),
          item: item.salary_component?.name ?? 'Pay item',
          amount: Number(item.amount ?? 0),
          effective_date: item.effective_date,
          notes: item.notes,
          payable: item.effective_date
            ? new Date(item.effective_date).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : 'Unknown',
          status: item.status,
        })) ?? [],
      payrollRuns:
        payrollRuns?.map((item: any) => {
          const runEntries = item.payroll_entries ?? [];
          const grossEarnings = runEntries.reduce(
            (sum: number, entry: any) =>
              sum + Number(entry.gross_earnings ?? 0),
            0,
          );
          const totalDeductions = runEntries.reduce(
            (sum: number, entry: any) =>
              sum + Number(entry.total_deductions ?? 0),
            0,
          );
          const payout = runEntries.reduce(
            (sum: number, entry: any) => sum + Number(entry.net_pay ?? 0),
            0,
          );

          return {
            id: item.id,
            name: item.name,
            period_start: item.period_start,
            period_end: item.period_end,
            payment_date: item.payment_date,
            period: `${new Date(item.period_start).toLocaleDateString('en-IN', {
              month: 'short',
              year: 'numeric',
            })}`,
            dates: formatPayrollRunPeriod(item),
            assignments:
              assignmentMetricsRows?.filter((assignment: any) =>
                isAssignmentEligibleForPayrollRun(assignment, item),
              ).length ?? 0,
            entries: runEntries.length,
            payout,
            grossEarnings,
            totalDeductions,
            status: item.status,
            breakdown: runEntries.map((entry: any) => ({
              id: entry.id,
              employee: formatPayrollEmployeeName(entry.employee),
              earnings: Number(entry.gross_earnings ?? 0),
              deductions: Number(entry.total_deductions ?? 0),
              net: Number(entry.net_pay ?? 0),
              status: entry.status,
              items: (entry.payroll_entry_items ?? []).map(
                (entryItem: any) => ({
                  id: entryItem.id,
                  component: entryItem.salary_component?.name ?? 'Unknown',
                  type: entryItem.salary_component?.type ?? 'earning',
                  source: entryItem.source,
                  amount: Number(entryItem.amount ?? 0),
                  isEmployerSide: Boolean(entryItem.is_employer_side),
                }),
              ),
            })),
          };
        }) ?? [],
      payrollEntries:
        payrollEntries?.map((item: any) => ({
          employee: formatPayrollEmployeeName(item.employee),
          earnings: Number(item.gross_earnings ?? 0),
          deductions: Number(item.total_deductions ?? 0),
          net: Number(item.net_pay ?? 0),
          status: item.status,
        })) ?? [],
      payslipSnapshots:
        payslips?.map((item: any) => ({
          employee: formatPayrollEmployeeName(item.employee),
          run: formatPayrollRunPeriod(item.payroll_run),
          gross: Number(item.gross_salary ?? 0),
          deductions: Number(item.deductions ?? 0),
          net: Number(item.net_salary ?? 0),
          status: item.status,
        })) ?? [],
    });
  },
);
