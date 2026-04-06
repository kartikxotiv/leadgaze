import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { decrypt } from '~/utils/crypto';

interface ImapSyncOptions {
  workspace_id: string;
  email: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password?: string; // Encrypted
  imap_host?: string;
  imap_port?: number;
  imap_secure?: boolean;
  last_synced_at?: string | null;
}

export class ImapSyncService {
  private workspace_id: string;
  private email: string;
  private config: any;
  private last_synced_at: Date | null;

  constructor(options: ImapSyncOptions) {
    this.workspace_id = options.workspace_id;
    this.email = options.email;
    this.last_synced_at = options.last_synced_at ? new Date(options.last_synced_at) : null;
    
    // Use IMAP specific fields if available, otherwise fallback to SMTP fields
    this.config = {
      host: options.imap_host || options.host,
      port: options.imap_port || (options.imap_secure ? 993 : 143),
      secure: options.imap_secure !== undefined ? options.imap_secure : options.secure,
      auth: {
        user: options.username,
        pass: options.password ? decrypt(options.password) : '',
      },
      logger: false,
    };
  }

  async sync() {
    console.log(`[ImapSync] Starting sync for ${this.email}...`);
    const client = new ImapFlow(this.config);

    try {
      await client.connect();
      
      // Select INBOX
      const lock = await client.getMailboxLock('INBOX');
      try {
        // Build search query: since last_synced_at
        const searchCriteria: any = { all: true };
        if (this.last_synced_at) {
          // IMAP SINCE is date-only (YYYY-MM-DD), but we can filter further in JS
          searchCriteria.since = this.last_synced_at;
        }

        let messages = await client.search(searchCriteria);
        if (messages && !this.last_synced_at && messages.length > 10) {
          messages = messages.slice(-10);
        }
        
        console.log(`[ImapSync] Found ${messages ? (messages as number[]).length : 0} messages potential candidates for ${this.email}`);

        let syncCount = 0;
        const messagesToUpsert: any[] = [];
        
        // Fetch and parse messages
        if (messages) {
          for (const seq of (messages as number[])) {
            const content = await client.fetchOne(seq.toString(), { source: true, envelope: true, internalDate: true });
            
            if (!content || !content.source) continue;

            // Check if message is newer than last_synced_at
            const receivedAt = new Date(content.internalDate || content.envelope?.date || '');
            if (this.last_synced_at && receivedAt <= this.last_synced_at) {
              continue;
            }

            const parsed = await simpleParser(content.source);
            const messageData = await this.prepareMessageData(parsed, receivedAt);
            if (messageData) {
              messagesToUpsert.push(messageData);
              syncCount++;
            }
          }
        }

        // Bulk upsert into emails table
        if (messagesToUpsert.length > 0) {
          const supabase = getSupabaseServerClient();
          const { error } = await supabase
            .from('emails')
            .upsert(messagesToUpsert, {
              onConflict: 'gmail_message_id'
            });

          if (error) {
            console.error(`[ImapSync] Error bulk saving emails for ${this.email}:`, error);
          }
        }

        // Update last_synced_at in DB
        const supabase = getSupabaseServerClient();
        await supabase
          .from('email_accounts')
          .update({ last_synced_at: new Date().toISOString() } as any)
          .eq('workspace_id', this.workspace_id)
          .eq('email', this.email);

        return syncCount;
      } finally {
        lock.release();
      }
    } catch (error) {
      console.error(`[ImapSync] Sync failed for ${this.email}:`, error);
      throw error;
    } finally {
      await client.logout();
    }
  }

  private async prepareMessageData(parsed: any, receivedAt: Date) {
    // Extract basic info
    const from_email = parsed.from?.value[0]?.address || '';
    const to_emails = parsed.to?.value?.map((v: any) => v.address).join(', ') || '';
    const subject = parsed.subject || '';
    const html_body = parsed.html || '';
    const text_body = parsed.text || '';
    const snippet = text_body.substring(0, 200);

    // Determine direction
    const direction = from_email.toLowerCase() === this.email.toLowerCase() ? 'outbound' : 'inbound';

    // Link to Entity (Lead or Contact)
    const entityInfo = await this.findLinkedEntity(direction === 'inbound' ? from_email : to_emails);

    // Prepare data for emails table
    const messageId = parsed.messageId || `imap-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    return {
      workspace_id: this.workspace_id,
      gmail_message_id: messageId, // Reusing this field as a unique provider ID
      direction,
      from_email,
      to_emails,
      subject: subject || '',
      html_body: html_body || '',
      text_body: text_body || '',
      snippet: snippet || '',
      received_at: receivedAt.toISOString(),
      entity_type: entityInfo?.type,
      entity_id: entityInfo?.id,
      status: direction === 'inbound' ? 'received' : 'sent',
    };
  }

  private async findLinkedEntity(targetEmails: string) {
    if (!targetEmails) return null;
    
    // Split to handle multiple recipients if outbound
    const emails = targetEmails.split(',').map(e => e.trim().toLowerCase());
    const supabase = getSupabaseServerClient();

    for (const email of emails) {
      // 1. Try Leads
      const { data: lead } = await supabase
        .from('crm_leads' as any)
        .select('id')
        .eq('workspace_id', this.workspace_id)
        .eq('email', email)
        .single();
      
      if (lead) return { type: 'lead', id: (lead as any).id };

      // 2. Try Contacts
      const { data: contact } = await supabase
        .from('crm_contacts' as any)
        .select('id')
        .eq('workspace_id', this.workspace_id)
        .eq('email', email)
        .single();
      
      if (contact) return { type: 'contact', id: (contact as any).id };
    }

    return null;
  }
}
