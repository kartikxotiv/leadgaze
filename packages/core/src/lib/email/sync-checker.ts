import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { CoreGmailSyncService } from './gmail-sync.service';
import { CoreImapSyncService } from './imap-sync.service';

async function prepareAccountForSync(supabase: any, account: any) {
  const { count, error } = await (supabase as any)
    .schema('core')
    .from('emails')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', account.workspace_id)
    .eq('email_account_id', account.id)
    .eq('is_deleted', false);

  if (error) throw error;

  if ((count ?? 0) === 0 && account.last_synced_at) {
    console.log(
      '[CoreEmailSync] No stored emails found; running bootstrap sync',
      {
        workspaceId: account.workspace_id,
        accountId: account.id,
        email: account.email,
        previousLastSyncedAt: account.last_synced_at,
      },
    );

    return {
      ...account,
      last_synced_at: null,
    };
  }

  return account;
}

export async function syncCoreEmailAccounts({
  workspaceId,
  accountIds,
}: {
  workspaceId: string;
  accountIds?: number[];
}) {
  const supabase = getSupabaseServerAdminClient();

  console.log('[CoreEmailSync] Loading sync-enabled accounts', {
    workspaceId,
    accountIds: accountIds ?? 'all',
  });

  let query = (supabase as any)
    .schema('core')
    .from('email_accounts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_sync_enabled', true)
    .eq('inbound_enabled', true);

  if (accountIds?.length) {
    query = query.in('id', accountIds);
  }

  const { data: accounts, error } = await query;
  if (error) throw error;

  console.log('[CoreEmailSync] Accounts selected for sync', {
    workspaceId,
    count: accounts?.length ?? 0,
    accounts: (accounts ?? []).map((account: any) => ({
      id: account.id,
      email: account.email,
      provider: account.provider,
      last_synced_at: account.last_synced_at,
      inbound_enabled: account.inbound_enabled,
      is_sync_enabled: account.is_sync_enabled,
      has_refresh_token: Boolean(account.refresh_token),
      has_imap_host: Boolean(account.imap_host || account.smtp_host),
    })),
  });

  let syncedCount = 0;
  let processedAccounts = 0;

  for (const account of accounts ?? []) {
    try {
      const syncAccount = await prepareAccountForSync(supabase, account);

      if (syncAccount.provider === 'google') {
        if (!syncAccount.refresh_token) {
          console.warn(
            '[CoreEmailSync] Skipping Google account without refresh token',
            {
              workspaceId,
              accountId: syncAccount.id,
              email: syncAccount.email,
            },
          );
          continue;
        }

        processedAccounts += 1;
        const accountSyncedCount = await new CoreGmailSyncService(
          syncAccount,
        ).sync();
        syncedCount += accountSyncedCount;
        console.log('[CoreEmailSync] Google account sync finished', {
          workspaceId,
          accountId: syncAccount.id,
          email: syncAccount.email,
          syncedCount: accountSyncedCount,
        });
      } else if (
        syncAccount.provider === 'smtp' ||
        syncAccount.provider === 'imap'
      ) {
        if (
          !(syncAccount.imap_host || syncAccount.smtp_host) ||
          !(syncAccount.imap_password || syncAccount.smtp_password)
        ) {
          console.warn(
            '[CoreEmailSync] Skipping IMAP account with incomplete config',
            {
              workspaceId,
              accountId: syncAccount.id,
              email: syncAccount.email,
              hasHost: Boolean(syncAccount.imap_host || syncAccount.smtp_host),
              hasPassword: Boolean(
                syncAccount.imap_password || syncAccount.smtp_password,
              ),
            },
          );
          continue;
        }

        processedAccounts += 1;
        const accountSyncedCount = await new CoreImapSyncService(
          syncAccount,
        ).sync();
        syncedCount += accountSyncedCount;
        console.log('[CoreEmailSync] IMAP account sync finished', {
          workspaceId,
          accountId: syncAccount.id,
          email: syncAccount.email,
          syncedCount: accountSyncedCount,
        });
      }
    } catch (error) {
      console.error(`[CoreEmailSync] Failed syncing ${account.email}:`, error);
    }
  }

  return {
    processedAccounts,
    syncedCount,
  };
}

export async function syncAllCoreEmailAccounts() {
  const supabase = getSupabaseServerAdminClient();

  const { data: accounts, error } = await (supabase as any)
    .schema('core')
    .from('email_accounts')
    .select('workspace_id')
    .eq('is_sync_enabled', true)
    .eq('inbound_enabled', true);

  if (error) throw error;

  const workspaceIds = Array.from<string>(
    new Set<string>(
      (accounts ?? [])
        .map((account: any) => account.workspace_id)
        .filter(
          (workspaceId: unknown): workspaceId is string =>
            typeof workspaceId === 'string',
        ),
    ),
  );

  let processedAccounts = 0;
  let syncedCount = 0;

  console.log('[CoreEmailSync] Starting all-workspace sync', {
    workspaceCount: workspaceIds.length,
    workspaceIds,
  });

  for (const workspaceId of workspaceIds) {
    const result = await syncCoreEmailAccounts({ workspaceId });
    processedAccounts += result.processedAccounts;
    syncedCount += result.syncedCount;
  }

  return {
    processedAccounts,
    syncedCount,
    workspaceCount: workspaceIds.length,
  };
}
