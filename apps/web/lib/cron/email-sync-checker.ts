import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { GmailSyncService } from '../email/gmail-sync.service';
import { ImapSyncService } from '../email/imap-sync.service';

export class EmailSyncChecker {
  static async syncAll() {
    console.log('[EmailSync] Starting sync for all accounts...');
    const supabase = getSupabaseServerClient();
    
    // Fetch all active and sync-enabled accounts
    const { data: accounts, error } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('is_active', true)
      .eq('is_sync_enabled', true);

    if (error) {
      console.error('[EmailSync] Error fetching accounts:', error);
      return 0;
    }

    if (!accounts || accounts.length === 0) {
      console.log('[EmailSync] No accounts found to sync.');
      return 0;
    }

    let totalSynced = 0;

    for (const account of (accounts as any[])) {
      try {
        let syncService;
        
        if (account.provider === 'google') {
          syncService = new GmailSyncService({
            workspace_id: account.workspace_id,
            email: account.email,
            access_token: account.access_token!,
            refresh_token: account.refresh_token!,
            expires_at: account.expires_at,
            last_synced_at: account.last_synced_at,
            history_id: account.history_id,
          });
        } else if (account.provider === 'smtp') {
          syncService = new ImapSyncService({
            workspace_id: account.workspace_id,
            email: account.email,
            host: account.host,
            port: account.port,
            secure: account.secure,
            username: account.username,
            password: account.password,
            imap_host: account.imap_host,
            imap_port: account.imap_port,
            imap_secure: account.imap_secure,
            last_synced_at: account.last_synced_at,
          });
        }

        if (syncService) {
          const count = await syncService.sync();
          totalSynced += count;
          console.log(`[EmailSync] Synced ${count} messages for ${account.email} (${account.provider})`);
        }
      } catch (err) {
        console.error(`[EmailSync] Error syncing account ${account.email}:`, err);
      }
    }

    return totalSynced;
  }
}
