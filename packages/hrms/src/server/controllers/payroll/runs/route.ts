/* eslint-disable @typescript-eslint/no-explicit-any */
import { enhanceRouteHandler } from '@kit/next/routes';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { getCurrentUserOrganizationId } from '~/lib/server/organizations';
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

function formatRunPeriod(run: { period_start: string; period_end: string }) {
  const start = new Date(`${run.period_start}T00:00:00`);
  const end = new Date(`${run.period_end}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${run.period_start} - ${run.period_end}`;
  }

  return `${start.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })} - ${end.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}`;
}

const listPayrollRunsController = catchAsync(async ({ user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient();
  const organizationId = await getCurrentUserOrganizationId(user?.id);

  if (!organizationId) {
    throw new ApiError('Organization not found for user', 404);
  }

  const { data, error } = await (supabaseAdmin as any)
    .from('payroll_runs')
    .select('id, name, period_start, period_end, payment_date, status')
    .eq('organization_id', organizationId)
    .order('period_start', { ascending: false });

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse(
    'Payroll runs fetched successfully',
    (data ?? []).map((run: any) => ({
      id: run.id,
      name: run.name,
      period: formatRunPeriod(run),
      period_start: run.period_start,
      period_end: run.period_end,
      payment_date: run.payment_date,
      status: run.status,
    })),
  );
});

export const dynamic = 'force-dynamic';

export const GET = enhanceRouteHandler(listPayrollRunsController);
