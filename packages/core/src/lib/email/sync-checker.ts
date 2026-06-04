import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { CoreGmailSyncService } from './gmail-sync.service';
import { CoreImapSyncService } from './imap-sync.service';

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
      if (account.provider === 'google') {
        if (!account.refresh_token) {
          console.warn('[CoreEmailSync] Skipping Google account without refresh token', {
            workspaceId,
            accountId: account.id,
            email: account.email,
          });
          continue;
        }

        processedAccounts += 1;
        const accountSyncedCount = await new CoreGmailSyncService(account).sync();
        syncedCount += accountSyncedCount;
        console.log('[CoreEmailSync] Google account sync finished', {
          workspaceId,
          accountId: account.id,
          email: account.email,
          syncedCount: accountSyncedCount,
        });
      } else if (account.provider === 'smtp' || account.provider === 'imap') {
        if (!(account.imap_host || account.smtp_host) || !(account.imap_password || account.smtp_password)) {
          console.warn('[CoreEmailSync] Skipping IMAP account with incomplete config', {
            workspaceId,
            accountId: account.id,
            email: account.email,
            hasHost: Boolean(account.imap_host || account.smtp_host),
            hasPassword: Boolean(account.imap_password || account.smtp_password),
          });
          continue;
        }

        processedAccounts += 1;
        const accountSyncedCount = await new CoreImapSyncService(account).sync();
        syncedCount += accountSyncedCount;
        console.log('[CoreEmailSync] IMAP account sync finished', {
          workspaceId,
          accountId: account.id,
          email: account.email,
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
        .filter((workspaceId: unknown): workspaceId is string => typeof workspaceId === 'string'),
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
