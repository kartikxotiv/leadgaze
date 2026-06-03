/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import type { Database } from '~/lib/database.types';
import { getCurrentUserOrganizationId } from '~/lib/server/organizations';
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

export const createPayrollRunController = catchAsync(async ({ body, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();
  const data = body as {
    name?: string;
    period_start: string;
    period_end: string;
    payment_date?: string | null;
  };
  const organizationId = await getCurrentUserOrganizationId(user?.id);

  if (!organizationId) {
    throw new ApiError('Organization not found for user', 404);
  }

  const periodStart = new Date(data.period_start);
  const periodEnd = new Date(data.period_end);
  const totalDaysInPeriod =
    (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24) + 1;

  const {
    data: availableSalaryComponents,
    error: availableSalaryComponentsError,
  } = await (supabaseAdmin as any)
    .from('salary_components')
    .select('id, code, name, type, taxable, display_order, is_active')
    .eq('organization_id', organizationId)
    .eq('is_active', true);

  if (availableSalaryComponentsError) {
    throw new ApiError(
      `Failed to fetch salary components: ${availableSalaryComponentsError.message}`,
      400,
    );
  }

  const { data: existingRun } = await (supabaseAdmin as any)
    .from('payroll_runs')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('period_start', data.period_start)
    .eq('period_end', data.period_end)
    .maybeSingle();

  if (existingRun && existingRun.status !== 'draft') {
    throw new ApiError(
      'A finalized payroll run already exists for this period.',
      400,
    );
  }

  const { data: assignments, error: assignmentsError } = await (
    supabaseAdmin as any
  )
    .from('employee_compensation_assignments')
    .select('*, employee:employees(*)')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .eq('is_primary', true)
    .lte('effective_from', data.period_end)
    .or(`effective_to.is.null,effective_to.gte.${data.period_start}`);

  if (assignmentsError) {
    throw new ApiError(
      `Failed to fetch eligible assignments: ${assignmentsError.message}`,
      400,
    );
  }

  if (!assignments || assignments.length === 0) {
    throw new ApiError(
      '0 eligible employees found. Please ensure: 1. Employees have a "Primary" compensation assignment. 2. Their salary has an "Effective From" date on or before your period end. 3. Their status is "active".',
      400,
    );
  }

  let runId: string;
  let runToUse: any;

  if (existingRun) {
    runId = existingRun.id;
    runToUse = existingRun;

    await (supabaseAdmin as any)
      .from('payroll_entries')
      .delete()
      .eq('payroll_run_id', runId);
  } else {
    const { data: createdRun, error: runError } = await (supabaseAdmin as any)
      .from('payroll_runs')
      .insert({
        organization_id: organizationId,
        name: data.name ?? null,
        period_start: data.period_start,
        period_end: data.period_end,
        payment_date: data.payment_date ?? null,
        status: 'draft',
        created_by: user?.id,
        updated_by: user?.id,
      })
      .select('*')
      .single();

    if (runError) {
      throw new ApiError(runError.message, 400);
    }

    runId = createdRun.id;
    runToUse = createdRun;
  }

  for (const assignment of assignments) {
    const { data: assignmentComponents, error: componentsError } = await (
      supabaseAdmin as any
    )
      .from('employee_compensation_components')
      .select('*, salary_component:salary_components(*)')
      .eq('compensation_assignment_id', assignment.id)
      .eq('is_recurring', true);

    if (componentsError) {
      console.error(
        `Error fetching components for assignment ${assignment.id}:`,
        componentsError,
      );
    }

    let components = assignmentComponents ?? [];

    if (components.length === 0 && assignment.salary_structure_id) {
      const { data: structureComponents, error: structureComponentsError } =
        await (supabaseAdmin as any)
          .from('salary_structure_components')
          .select('*, salary_component:salary_components(*)')
          .eq('salary_structure_id', assignment.salary_structure_id)
          .eq('is_recurring', true);

      if (structureComponentsError) {
        console.error(
          `Error fetching structure components for assignment ${assignment.id}:`,
          structureComponentsError,
        );
      } else {
        components = structureComponents ?? [];
      }
    }

    const empEffectiveFrom = new Date(assignment.effective_from);
    const empEffectiveTo = assignment.effective_to
      ? new Date(assignment.effective_to)
      : null;

    const actualStart =
      empEffectiveFrom > periodStart ? empEffectiveFrom : periodStart;
    const actualEnd =
      empEffectiveTo && empEffectiveTo < periodEnd ? empEffectiveTo : periodEnd;
    const actualDays =
      (actualEnd.getTime() - actualStart.getTime()) / (1000 * 60 * 60 * 24) + 1;
    const prorationFactor = actualDays / totalDaysInPeriod;

    const { data: payItems } = await (supabaseAdmin as any)
      .from('employee_pay_items')
      .select('*, salary_component:salary_components(*)')
      .eq('employee_id', assignment.employee_id)
      .eq('status', 'approved')
      .gte('effective_date', data.period_start)
      .lte('effective_date', data.period_end);

    const monthlyCTC = Number(assignment.annual_ctc ?? 0) / 12;
    const monthlyGross = Number(assignment.monthly_gross ?? 0);

    let grossEarnings = 0;
    let totalDeductions = 0;
    let employerContributions = 0;

    const entryItemPayloads: any[] = [];
    const payItemIdsToApply: string[] = [];
    const resolvedComponents: Record<string, number> = {};
    const sortedComponents = [...components].sort((a, b) => {
      if (a.salary_component?.code === 'BASIC') return -1;
      if (b.salary_component?.code === 'BASIC') return 1;
      return 0;
    });

    for (const comp of sortedComponents) {
      let amount = 0;
      const calcValue = Number(comp.calculation_value || 0);

      switch (comp.calculation_type) {
        case 'fixed_amount':
          amount = calcValue;
          break;
        case 'percentage_of_ctc':
          amount = (calcValue / 100) * monthlyCTC;
          break;
        case 'percentage_of_gross':
          amount = (calcValue / 100) * monthlyGross;
          break;
        case 'percentage_of_basic':
          amount = (calcValue / 100) * (resolvedComponents.BASIC || 0);
          break;
        default:
          amount = Number(comp.amount_override || 0);
      }

      if (comp.is_pro_ratable) {
        amount *= prorationFactor;
      }

      resolvedComponents[comp.salary_component?.code || comp.id] = amount;

      const type = comp.salary_component?.type;
      if (type === 'earning') grossEarnings += amount;
      else if (type === 'deduction') totalDeductions += amount;
      else if (type === 'employer_contribution')
        employerContributions += amount;

      entryItemPayloads.push({
        organization_id: organizationId,
        salary_component_id: comp.salary_component_id,
        source: 'assignment',
        amount,
        is_taxable: comp.is_taxable,
        is_employer_side: type === 'employer_contribution',
        display_order: comp.display_order,
      });
    }

    if (components.length === 0) {
      const fallbackGross = (monthlyGross || monthlyCTC) * prorationFactor;
      grossEarnings += fallbackGross;

      const fallbackEarningComponent =
        availableSalaryComponents?.find((component: any) =>
          ['GROSS', 'GROSS_SALARY', 'SALARY', 'BASIC', 'BASIC_PAY'].includes(
            String(component.code || '').toUpperCase(),
          ),
        ) ??
        availableSalaryComponents?.find(
          (component: any) => component.type === 'earning',
        );

      if (fallbackEarningComponent && fallbackGross > 0) {
        entryItemPayloads.push({
          organization_id: organizationId,
          salary_component_id: fallbackEarningComponent.id,
          source: 'assignment',
          amount: fallbackGross,
          is_taxable: Boolean(fallbackEarningComponent.taxable),
          is_employer_side: false,
          display_order: fallbackEarningComponent.display_order ?? 999,
        });
      }
    }

    if (payItems) {
      for (const item of payItems) {
        const amount = Number(item.amount || 0);
        const type = item.salary_component?.type;

        if (type === 'earning') grossEarnings += amount;
        else if (type === 'deduction') totalDeductions += amount;

        entryItemPayloads.push({
          organization_id: organizationId,
          salary_component_id: item.salary_component_id,
          employee_pay_item_id: item.id,
          source: 'pay_item',
          amount,
          is_taxable: item.salary_component?.taxable ?? false,
          is_employer_side: type === 'employer_contribution',
        });
      }
    }

    const { data: entry, error: entryError } = await (supabaseAdmin as any)
      .from('payroll_entries')
      .insert({
        organization_id: organizationId,
        payroll_run_id: runId,
        employee_id: assignment.employee_id,
        compensation_assignment_id: assignment.id,
        status: 'calculated',
        attendance_days: actualDays,
        paid_days: actualDays,
        gross_earnings: grossEarnings,
        total_deductions: totalDeductions,
        employer_contributions: employerContributions,
        net_pay: grossEarnings - totalDeductions,
        calculated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (entryError) {
      console.error('Error creating entry:', entryError);
      continue;
    }

    for (const itemPayload of entryItemPayloads) {
      const { error: itemInsertError } = await (supabaseAdmin as any)
        .from('payroll_entry_items')
        .insert({
          ...itemPayload,
          payroll_entry_id: entry.id,
        });

      if (itemInsertError) {
        console.error('Error inserting payroll entry item:', {
          error: itemInsertError,
          itemPayload,
          assignmentId: assignment.id,
          employeeId: assignment.employee_id,
        });
        continue;
      }

      if (
        itemPayload.source === 'pay_item' &&
        itemPayload.employee_pay_item_id
      ) {
        payItemIdsToApply.push(itemPayload.employee_pay_item_id);
      }
    }

    if (payItemIdsToApply.length > 0) {
      await (supabaseAdmin as any)
        .from('employee_pay_items')
        .update({ status: 'applied' })
        .in('id', payItemIdsToApply);
    }
  }

  return successDataResponse(
    'Payroll run and entries created successfully',
    runToUse,
  );
});
