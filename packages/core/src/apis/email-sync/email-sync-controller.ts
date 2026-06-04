import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  getWorkspaceMemberContext,
  listWorkspaceEmailAccounts,
} from '../../lib/email/account-access';
import { syncCoreEmailAccounts } from '../../lib/email/sync-checker';
import { catchAsync, successDataResponse } from '../../utils/response-handler';

export const syncCoreEmailAccountsController = catchAsync(async ({ request }) => {
  const body = await request.json().catch(() => ({}));
  const workspaceId = body?.workspace_id ?? body?.workspaceId;
  const requestedAccountId = body?.email_account_id ?? body?.emailAccountId;

  if (!workspaceId) {
    return NextResponse.json(
      { success: false, message: 'workspace_id is required' },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServerClient();
  const memberContext = await getWorkspaceMemberContext(supabase, workspaceId);

  if (!memberContext) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
  }

  const accounts = await listWorkspaceEmailAccounts(supabase, workspaceId);
  const syncableAccounts = accounts.filter(
    (account: any) =>
      account.can_view_inbox &&
      account.is_sync_enabled !== false &&
      account.inbound_enabled !== false,
  );

  const accountIds = requestedAccountId
    ? syncableAccounts
        .filter((account: any) => account.id === Number(requestedAccountId))
        .map((account: any) => account.id)
    : syncableAccounts.map((account: any) => account.id);

  console.log('[CoreEmailSync] Manual sync requested', {
    workspaceId,
    requestedAccountId: requestedAccountId ?? null,
    visibleAccounts: accounts.map((account: any) => ({
      id: account.id,
      email: account.email,
      provider: account.provider,
      can_view_inbox: account.can_view_inbox,
      is_sync_enabled: account.is_sync_enabled,
      inbound_enabled: account.inbound_enabled,
    })),
    selectedAccountIds: accountIds,
  });

  if (requestedAccountId && accountIds.length === 0) {
    return NextResponse.json(
      { success: false, message: 'You do not have access to sync this inbox' },
      { status: 403 },
    );
  }

  if (accountIds.length === 0) {
    return successDataResponse('No sync-enabled inboxes available', {
      processedAccounts: 0,
      syncedCount: 0,
    });
  }

  const result = await syncCoreEmailAccounts({ workspaceId, accountIds });

  return successDataResponse('Email inbox sync completed', result);
});
