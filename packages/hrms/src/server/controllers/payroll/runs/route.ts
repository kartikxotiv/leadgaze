/* eslint-disable @typescript-eslint/no-explicit-any */
import { enhanceRouteHandler } from '@kit/next/routes';

import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '../../../../utils/response-handler';
import { getPayrollContext } from '../payroll-context';
import { formatDate } from '@kit/shared/utils';

function formatRunPeriod(run: { period_start: string; period_end: string }) {
  return `${formatDate(run.period_start)} - ${formatDate(run.period_end)}`;
}

const listPayrollRunsController = catchAsync(async ({ request, user }) => {
  const { hrms, userId, workspaceId } = await getPayrollContext({
    featureKey: 'view',
    minAccessLevel: 'own',
    request,
    user,
  });

  const { data, error } = await hrms
    .from('payroll_runs')
    .select('id, name, period_start, period_end, payment_date, status')
    .eq('workspace_id', workspaceId)
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
