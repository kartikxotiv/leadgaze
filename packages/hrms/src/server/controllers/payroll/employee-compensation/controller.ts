/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { getCurrentUserOrganizationId } from '~/lib/server/organizations';
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

export const employeeCompensationController = {
  list: catchAsync(async ({ user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient();
    const organizationId = await getCurrentUserOrganizationId(user?.id);

    if (!organizationId) {
      throw new ApiError('Organization not found for user', 404);
    }

    const { data, error } = await (supabaseAdmin as any)
      .from('employee_compensation_assignments')
      .select(`*, employee:employees(first_name, last_name)`)
      .eq('organization_id', organizationId)
      .order('effective_from', { ascending: false });

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse(data ?? []);
  }),

  create: catchAsync(async ({ body, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient();
    const organizationId = await getCurrentUserOrganizationId(user?.id);

    if (!organizationId) {
      throw new ApiError('Organization not found for user', 404);
    }

    const data = body as {
      employee_id: string;
      salary_structure_id?: string;
      assignment_type: string;
      pay_frequency: string;
      annual_ctc?: number;
      monthly_gross?: number;
      effective_from: string;
      effective_to?: string;
      notes?: string;
    };

    const isPrimary = data.assignment_type === 'primary';

    // 1a. Handle overlapping primary assignments by automatically ending the previous one
    if (isPrimary) {
      const newFromDate = new Date(data.effective_from);
      const dayBeforeStart = new Date(
        newFromDate.getTime() - 24 * 60 * 60 * 1000,
      )
        .toISOString()
        .split('T')[0];

      const { data: overlaps, error: overlapsError } = await (
        supabaseAdmin as any
      )
        .from('employee_compensation_assignments')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('employee_id', data.employee_id)
        .eq('is_primary', true)
        .in('status', ['active', 'draft'])
        .or(`effective_to.is.null,effective_to.gte.${data.effective_from}`);

      if (overlaps && overlaps.length > 0) {
        for (const overlap of overlaps) {
          const overlapFrom = new Date(overlap.effective_from);
          const overlapTo = overlap.effective_to
            ? new Date(overlap.effective_to)
            : null;

          // If the old assignment starts on or after the new start date,
          // archived it because it completely conflicts with the new timeline.
          if (overlapFrom >= newFromDate) {
            await (supabaseAdmin as any)
              .from('employee_compensation_assignments')
              .update({ status: 'cancelled', updated_by: user?.id })
              .eq('id', overlap.id);
          } else {
            // Otherwise, set the old assignment's end date to one day before the new one starts.
            await (supabaseAdmin as any)
              .from('employee_compensation_assignments')
              .update({
                effective_to: dayBeforeStart,
                status: 'closed',
                updated_by: user?.id,
              })
              .eq('id', overlap.id);
          }
        }
      }
    }

    // 1b. Create the assignment
    const { data: createdAssignment, error: assignmentError } = await (
      supabaseAdmin as any
    )
      .from('employee_compensation_assignments')
      .insert({
        organization_id: organizationId,
        employee_id: data.employee_id,
        salary_structure_id: data.salary_structure_id ?? null,
        assignment_type: data.assignment_type,
        pay_frequency: data.pay_frequency,
        currency_code: 'INR',
        annual_ctc: data.annual_ctc ?? null,
        monthly_gross: data.monthly_gross ?? null,
        effective_from: data.effective_from,
        effective_to: data.effective_to ?? null,
        notes: data.notes ?? null,
        is_primary: isPrimary,
        status: 'active',
        created_by: user?.id,
        updated_by: user?.id,
      })
      .select(`*, employee:employees(first_name, last_name)`)
      .single();

    if (assignmentError) {
      throw new ApiError(assignmentError.message, 400);
    }

    // 2. If a salary structure is assigned, copy its components
    if (data.salary_structure_id) {
      const { data: structureComponents, error: structureError } = await (
        supabaseAdmin as any
      )
        .from('salary_structure_components')
        .select(
          `
          *,
          salary_component:salary_components(taxable)
        `,
        )
        .eq('salary_structure_id', data.salary_structure_id);

      if (structureError) {
        console.error('Error fetching structure components:', structureError);
      } else if (structureComponents && structureComponents.length > 0) {
        console.log(
          `Copying ${structureComponents.length} components from structure ${data.salary_structure_id} to assignment ${createdAssignment.id}`,
        );
        const componentPayloads = structureComponents.map((sc: any) => ({
          organization_id: organizationId,
          compensation_assignment_id: createdAssignment.id,
          salary_component_id: sc.salary_component_id,
          calculation_type: sc.calculation_type,
          calculation_value: sc.calculation_value,
          amount_override: sc.amount_override,
          is_recurring: sc.is_recurring,
          is_pro_ratable: sc.is_pro_ratable,
          is_taxable: sc.salary_component?.taxable ?? false,
          effective_from: createdAssignment.effective_from,
          effective_to: createdAssignment.effective_to,
          display_order: sc.display_order,
          created_by: user?.id,
          updated_by: user?.id,
        }));

        const { error: insertCompError } = await (supabaseAdmin as any)
          .from('employee_compensation_components')
          .insert(componentPayloads);

        if (insertCompError) {
          console.error(
            'Error inserting compensation components:',
            insertCompError,
          );
        }
      }
    }

    return successDataResponse(createdAssignment);
  }),

  update: catchAsync(async ({ params, body, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient();
    const id = params?.id as string;
    const organizationId = await getCurrentUserOrganizationId(user?.id);

    if (!organizationId) {
      throw new ApiError('Organization not found for user', 404);
    }

    const data = body as {
      assignment_type?: string;
      pay_frequency?: string;
      annual_ctc?: number;
      monthly_gross?: number;
      effective_from?: string;
      effective_to?: string;
      notes?: string;
      status?: string;
    };

    const { data: updated, error } = await (supabaseAdmin as any)
      .from('employee_compensation_assignments')
      .update({
        ...data,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select(`*, employee:employees(first_name, last_name)`)
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse(updated);
  }),

  delete: catchAsync(async ({ params, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient();
    const id = params?.id as string;
    const organizationId = await getCurrentUserOrganizationId(user?.id);

    if (!organizationId) {
      throw new ApiError('Organization not found for user', 404);
    }

    const { error } = await (supabaseAdmin as any)
      .from('employee_compensation_assignments')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse({ success: true });
  }),
};
