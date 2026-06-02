import { NextResponse } from 'next/server';

import { assertInventoryPermission } from '../_shared/permissions';
import { assertWorkspaceAccess } from '../_shared/workspace-access';
import { catchAsync, successDataResponse } from '../../utils/response-handler';

export const getStockController = catchAsync(async ({ request }) => {
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get('workspaceId');

  if (!workspaceId) {
    return NextResponse.json(
      { success: false, message: 'workspaceId query parameter is required' },
      { status: 400 },
    );
  }

  const { supabase, user, error } = await assertWorkspaceAccess(workspaceId);

  if (error || !user) {
    return error!;
  }

  await assertInventoryPermission({
    supabase,
    userId: user.id,
    workspaceId,
    moduleKey: 'inventory_stock',
    featureKey: 'view',
  });

  return successDataResponse(
    'Stock controller scaffold is ready',
    { workspaceId, moduleKey: 'inventory_stock', featureKey: 'view' },
  );
});
