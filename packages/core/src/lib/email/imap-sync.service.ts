import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { decrypt } from './crypto';
import { findCoreEmailEntityByEmail } from './entity-linking';
import { saveSyncedCoreEmails } from './email-sync-store';

export interface CoreImapSyncOptions {
  id: number;
  workspace_id: string;
  email: string;
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_secure?: boolean | null;
  smtp_username?: string | null;
  smtp_password?: string | null;
  imap_host?: string | null;
  imap_port?: number | null;
  imap_secure?: boolean | null;
  imap_username?: string | null;
  imap_password?: string | null;
  last_synced_at?: string | null;
}

function normalizeAddress(value?: string | null) {
  return value?.trim().toLowerCase() ?? '';
}

export class CoreImapSyncService {
  private readonly lastSyncedAt: Date | null;

  constructor(private readonly options: CoreImapSyncOptions) {
    this.lastSyncedAt = options.last_synced_at ? new Date(options.last_synced_at) : null;
  }

  async sync() {
    const host = this.options.imap_host || this.options.smtp_host;
    const username = this.options.imap_username || this.options.smtp_username;
    const encryptedPassword = this.options.imap_password || this.options.smtp_password;

    console.log('[CoreEmailSync:IMAP] Starting sync', {
      accountId: this.options.id,
      email: this.options.email,
      workspaceId: this.options.workspace_id,
      host,
      port: this.options.imap_port || (this.options.imap_secure === false ? 143 : 993),
      secure: this.options.imap_secure !== false,
      lastSyncedAt: this.lastSyncedAt?.toISOString() ?? null,
      firstSync: !this.lastSyncedAt,
    });

    if (!host || !username || !encryptedPassword) {
      throw new Error('Incomplete IMAP configuration');
    }

    const client = new ImapFlow({
      host,
      port: this.options.imap_port || (this.options.imap_secure === false ? 143 : 993),
      secure: this.options.imap_secure !== false,
      auth: {
        user: username,
        pass: decrypt(encryptedPassword),
      },
      logger: false,
    });

    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');

      try {
        const criteria: any = { all: true };
        if (this.lastSyncedAt) criteria.since = this.lastSyncedAt;

        let messages = (await client.search(criteria)) as number[];
        const foundCount = messages.length;
        if (!this.lastSyncedAt && messages.length > 10) {
          messages = messages.slice(-10);
        }

        console.log('[CoreEmailSync:IMAP] Provider returned message sequence numbers', {
          accountId: this.options.id,
          email: this.options.email,
          foundCount,
          selectedCount: messages.length,
          selectedSequences: messages.slice(0, 20),
        });

        const payloads = [];

        for (const sequence of messages) {
          const content = await client.fetchOne(sequence.toString(), {
            source: true,
            envelope: true,
            internalDate: true,
          });

          if (!content?.source) continue;

          const receivedAt = new Date(content.internalDate || content.envelope?.date || Date.now());
          if (this.lastSyncedAt && receivedAt <= this.lastSyncedAt) continue;

          const parsed = await simpleParser(content.source);
          const payload = await this.toCoreEmailPayload(parsed, receivedAt);
          if (payload) {
            console.log('[CoreEmailSync:IMAP] Prepared message', {
              accountId: this.options.id,
              email: this.options.email,
              providerMessageId: payload.provider_message_id,
              direction: payload.direction,
              from: payload.from_email,
              to: payload.to_emails,
              subject: payload.subject,
              receivedAt: payload.received_at,
              sentAt: payload.sent_at,
            });
            payloads.push(payload);
          }
        }

        const savedCount = await saveSyncedCoreEmails(payloads);
        await this.updateSyncState(null, messages.length > 0 || payloads.length > 0);

        console.log('[CoreEmailSync:IMAP] Sync complete', {
          accountId: this.options.id,
          email: this.options.email,
          selectedCount: messages.length,
          preparedCount: payloads.length,
          savedCount,
        });

        return savedCount;
      } finally {
        lock.release();
      }
    } catch (error: any) {
      await this.updateSyncState(error.message ?? 'IMAP sync failed');
      throw error;
    } finally {
      await client.logout().catch(() => undefined);
    }
  }

  private async toCoreEmailPayload(parsed: any, receivedAt: Date) {
    const fromEmail = normalizeAddress(parsed.from?.value?.[0]?.address);
    const toEmails = (parsed.to?.value ?? [])
      .map((item: any) => normalizeAddress(item.address))
      .filter(Boolean);
    const ccEmails = (parsed.cc?.value ?? [])
      .map((item: any) => normalizeAddress(item.address))
      .filter(Boolean);
    const bccEmails = (parsed.bcc?.value ?? [])
      .map((item: any) => normalizeAddress(item.address))
      .filter(Boolean);
    const direction = fromEmail === this.options.email.toLowerCase() ? 'outbound' : 'inbound';
    const targetEmail = direction === 'inbound' ? fromEmail : toEmails[0];
    const entity = targetEmail
      ? await findCoreEmailEntityByEmail(this.options.workspace_id, targetEmail)
      : null;
    const providerMessageId =
      parsed.messageId || `imap-${this.options.id}-${receivedAt.getTime()}-${fromEmail}-${parsed.subject ?? ''}`;

    if (!fromEmail) return null;

    return {
      workspace_id: this.options.workspace_id,
      email_account_id: this.options.id,
      provider_message_id: providerMessageId,
      internet_message_id: parsed.messageId ?? null,
      thread_key: parsed.references?.[0] ?? parsed.inReplyTo ?? parsed.messageId ?? providerMessageId,
      in_reply_to: parsed.inReplyTo ?? null,
      email_references: Array.isArray(parsed.references)
        ? parsed.references.join(' ')
        : parsed.references ?? null,
      direction,
      from_email: fromEmail,
      to_email: toEmails[0] ?? null,
      to_emails: toEmails,
      cc_emails: ccEmails,
      bcc_emails: bccEmails,
      subject: parsed.subject || '(No Subject)',
      body: parsed.html || parsed.text || '',
      html_body: parsed.html || null,
      text_body: parsed.text || null,
      snippet: parsed.text?.slice(0, 200) ?? '',
      raw_headers: Object.fromEntries(parsed.headers ?? []),
      status: direction === 'inbound' ? 'received' : 'sent',
      sent_at: direction === 'outbound' ? receivedAt.toISOString() : null,
      received_at: direction === 'inbound' ? receivedAt.toISOString() : null,
      relation: entity
        ? { entity_type: entity.type, entity_id: entity.id, relation_type: 'participant' }
        : null,
    };
  }

  private async updateSyncState(error: string | null, shouldAdvanceLastSyncedAt = true) {
    const supabase = getSupabaseServerAdminClient();
    const updatePayload: Record<string, unknown> = { last_error: error };

    if (shouldAdvanceLastSyncedAt) {
      updatePayload.last_synced_at = new Date().toISOString();
    }

    await (supabase as any)
      .schema('core')
      .from('email_accounts')
      .update(updatePayload)
      .eq('id', this.options.id)
      .eq('workspace_id', this.options.workspace_id);
  }
}
