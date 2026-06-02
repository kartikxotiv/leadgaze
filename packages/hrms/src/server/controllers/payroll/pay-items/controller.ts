/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { getCurrentUserOrganizationId } from '~/lib/server/organizations';
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

export const employeePayItemController = {
  create: catchAsync(async ({ body, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient();
    const organizationId = await getCurrentUserOrganizationId(user?.id);

    if (!organizationId) {
      throw new ApiError('Organization not found for user', 404);
    }

    const data = body as {
      employee_id: string;
      salary_component_id: string;
      amount: number;
      effective_date: string;
      notes?: string;
    };

    const { data: created, error } = await (supabaseAdmin as any)
      .from('employee_pay_items')
      .insert({
        organization_id: organizationId,
        employee_id: data.employee_id,
        salary_component_id: data.salary_component_id,
        amount: data.amount,
        effective_date: data.effective_date,
        notes: data.notes ?? null,
        status: 'approved',
        created_by: user?.id,
        updated_by: user?.id,
      })
      .select(
        `*, salary_component:salary_components(name), employee:employees(first_name, last_name)`,
      )
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse(created);
  }),

  update: catchAsync(async ({ params, body, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient();
    const id = params?.id as string;
    const organizationId = await getCurrentUserOrganizationId(user?.id);

    if (!organizationId) {
      throw new ApiError('Organization not found for user', 404);
    }

    const data = body as {
      amount?: number;
      effective_date?: string;
      notes?: string;
    };

    const { data: updated, error } = await (supabaseAdmin as any)
      .from('employee_pay_items')
      .update({
        ...data,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select(
        `*, salary_component:salary_components(name), employee:employees(first_name, last_name)`,
      )
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
      .from('employee_pay_items')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse({ success: true });
  }),
};
