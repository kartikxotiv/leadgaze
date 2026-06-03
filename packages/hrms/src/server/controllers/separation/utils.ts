import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import type { Database } from '~/lib/database.types';
import { getCurrentUserOrganizationId } from '~/lib/server/organizations';
import { ApiError } from '~/utils/response-handler';

export interface BaseSeparationItem {
  employee?: {
    organization_id?: string;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
}

/**
 * Extend the generated Database type to include tables that might be
 * missing from the auto-generated types but exist in the DB.
 * We use 'any' for these specific tables because they are not present
 * in the auto-generated types, and providing a partial schema often
 * breaks Supabase's complex Postgrest generics.
 */
export type ExtendedDatabase = Database & {
  public: {
    Tables: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      asset_clearances: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      exit_checklist_items: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      exit_checklists: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      employee_exit_letters: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fnf_settlements: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resignation_requests: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payroll_runs: any;
    };
  };
};

async function getRequiredOrganizationId(userId?: string) {
  const organizationId = await getCurrentUserOrganizationId(userId);

  if (!organizationId) {
    throw new ApiError('Organization not found for user', 404);
  }

  return organizationId;
}

async function ensureEmployeeInOrganization(params: {
  employeeId: string;
  organizationId: string;
  fieldName?: string;
}) {
  const supabaseAdmin = getSupabaseServerAdminClient<ExtendedDatabase>();

  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('id')
    .eq('id', params.employeeId)
    .eq('organization_id', params.organizationId)
    .maybeSingle();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  if (!data) {
    throw new ApiError(`${params.fieldName ?? 'employee_id'} is invalid`, 400);
  }

  return data;
}

async function ensurePayrollRunInOrganization(params: {
  payrollRunId: string;
  organizationId: string;
}) {
  const supabaseAdmin = getSupabaseServerAdminClient<ExtendedDatabase>();

  const { data, error } = await supabaseAdmin
    .from('payroll_runs')
    .select('id')
    .eq('id', params.payrollRunId)
    .eq('organization_id', params.organizationId)
    .maybeSingle();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  if (!data) {
    throw new ApiError('payroll_run_id is invalid', 400);
  }

  return data;
}

async function getResignationOrThrow(params: {
  resignationId: string;
  organizationId: string;
}) {
  const supabaseAdmin = getSupabaseServerAdminClient<ExtendedDatabase>();

  const { data, error } = await supabaseAdmin
    .from('resignation_requests')
    .select(
      'id, employee_id, employee:employees!resignation_requests_employee_id_fkey!inner(id, organization_id)',
    )
    .eq('id', params.resignationId)
    .eq('employee.organization_id', params.organizationId)
    .maybeSingle();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  if (!data) {
    throw new ApiError('Resignation request not found', 404);
  }

  return data as unknown as { employee_id: string; id: string };
}

export {
  ensureEmployeeInOrganization,
  ensurePayrollRunInOrganization,
  getRequiredOrganizationId,
  getResignationOrThrow,
};
