/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';
import { getPayrollContext } from './payroll-context';

export const approvePayrollRunController = catchAsync(
  async ({ params, request, user }) => {
    const runId = params?.id as string;
    const { hrms, userId, workspaceId } = await getPayrollContext({
      featureKey: 'approve',
      minAccessLevel: 'team',
      request,
      user,
    });

    const { data: run, error: runError } = await hrms
      .from('payroll_runs')
      .select('*')
      .eq('id', runId)
      .eq('workspace_id', workspaceId)
      .single();

    if (runError || !run) {
      throw new ApiError('Payroll run not found', 404);
    }

    if (run.status === 'paid' || run.status === 'approved') {
      throw new ApiError('Payroll run is already finalized', 400);
    }

    const { data: entries, error: entriesError } = await hrms
      .from('payroll_entries')
      .select('*, payroll_entry_items(*)')
      .eq('payroll_run_id', runId);

    if (entriesError || !entries || entries.length === 0) {
      throw new ApiError('No entries found for this payroll run', 400);
    }

    for (const entry of entries) {
      const { data: payslip, error: payslipError } = await hrms
        .from('payslips')
        .insert({
          workspace_id: workspaceId,
          payroll_run_id: runId,
          payroll_entry_id: entry.id,
          employee_id: entry.employee_id,
          status: 'generated',
          gross_salary: entry.gross_earnings,
          deductions: entry.total_deductions,
          employer_contributions: entry.employer_contributions,
          net_salary: entry.net_pay,
          generated_at: new Date().toISOString(),
          created_by: userId,
          updated_by: userId,
        })
        .select()
        .single();

      if (payslipError) {
        console.error('Error creating payslip:', payslipError);
        continue;
      }

      const entryItems = entry.payroll_entry_items || [];

      if (entryItems.length > 0) {
        const payslipComponents = entryItems.map((item: any) => ({
          workspace_id: workspaceId,
          payslip_id: payslip.id,
          salary_component_id: item.salary_component_id,
          payroll_entry_item_id: item.id,
          source: item.source,
          amount: item.amount,
          quantity: item.quantity,
          rate: item.rate,
          is_taxable: item.is_taxable,
          is_employer_side: item.is_employer_side,
          display_order: item.display_order,
          metadata: item.metadata,
          created_by: userId,
          updated_by: userId,
        }));

        const { error: componentsError } = await hrms
          .from('payslip_components')
          .insert(payslipComponents);

        if (componentsError) {
          console.error('Error creating payslip components:', componentsError);
        }
      }

      await hrms
        .from('payroll_entries')
        .update({ status: 'approved' })
        .eq('id', entry.id);
    }

    const { data: updatedRun, error: updateRunError } = await hrms
      .from('payroll_runs')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: userId,
        updated_by: userId,
      })
      .eq('id', runId)
      .select()
      .single();

    if (updateRunError) {
      throw new ApiError(updateRunError.message, 400);
    }

    return successDataResponse(
      'Payroll run approved and payslips generated',
      updatedRun,
    );
  },
);
