import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { CoreGmailSyncService } from './gmail-sync.service';
import { CoreImapSyncService } from './imap-sync.service';

const DEFAULT_ACCOUNT_SYNC_BATCH_SIZE = 5;
const DEFAULT_WORKSPACE_SYNC_BATCH_SIZE = 3;

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

async function runInBatches<T, R>(
  items: T[],
  batchSize: number,
  handler: (item: T) => Promise<R>,
) {
  const results: R[] = [];

  for (const batch of chunkArray(items, batchSize)) {
    results.push(...(await Promise.all(batch.map(handler))));
  }

  return results;
}

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

async function syncCoreEmailAccount(
  supabase: any,
  workspaceId: string,
  account: any,
) {
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

        return { processedAccounts: 0, syncedCount: 0 };
      }

      const accountSyncedCount = await new CoreGmailSyncService(
        syncAccount,
      ).sync();

      console.log('[CoreEmailSync] Google account sync finished', {
        workspaceId,
        accountId: syncAccount.id,
        email: syncAccount.email,
        syncedCount: accountSyncedCount,
      });

      return { processedAccounts: 1, syncedCount: accountSyncedCount };
    }

    if (syncAccount.provider === 'smtp' || syncAccount.provider === 'imap') {
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

        return { processedAccounts: 0, syncedCount: 0 };
      }

      const accountSyncedCount = await new CoreImapSyncService(
        syncAccount,
      ).sync();

      console.log('[CoreEmailSync] IMAP account sync finished', {
        workspaceId,
        accountId: syncAccount.id,
        email: syncAccount.email,
        syncedCount: accountSyncedCount,
      });

      return { processedAccounts: 1, syncedCount: accountSyncedCount };
    }

    console.warn('[CoreEmailSync] Skipping unsupported provider', {
      workspaceId,
      accountId: syncAccount.id,
      email: syncAccount.email,
      provider: syncAccount.provider,
    });

    return { processedAccounts: 0, syncedCount: 0 };
  } catch (error) {
    console.error(`[CoreEmailSync] Failed syncing ${account.email}:`, error);
    return { processedAccounts: 0, syncedCount: 0 };
  }
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

  const accountBatchSize = positiveInteger(
    process.env.CORE_EMAIL_SYNC_ACCOUNT_BATCH_SIZE,
    DEFAULT_ACCOUNT_SYNC_BATCH_SIZE,
  );
  const results = await runInBatches(
    accounts ?? [],
    accountBatchSize,
    (account: any) => syncCoreEmailAccount(supabase, workspaceId, account),
  );
  const processedAccounts = results.reduce(
    (sum, result) => sum + result.processedAccounts,
    0,
  );
  const syncedCount = results.reduce(
    (sum, result) => sum + result.syncedCount,
    0,
  );

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

  const workspaceBatchSize = positiveInteger(
    process.env.CORE_EMAIL_SYNC_WORKSPACE_BATCH_SIZE,
    DEFAULT_WORKSPACE_SYNC_BATCH_SIZE,
  );
  const results = await runInBatches(
    workspaceIds,
    workspaceBatchSize,
    (workspaceId) => syncCoreEmailAccounts({ workspaceId }),
  );

  processedAccounts = results.reduce(
    (sum, result) => sum + result.processedAccounts,
    0,
  );
  syncedCount = results.reduce((sum, result) => sum + result.syncedCount, 0);

  return {
    processedAccounts,
    syncedCount,
    workspaceCount: workspaceIds.length,
  };
}
