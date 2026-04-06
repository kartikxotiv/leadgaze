import { google } from 'googleapis';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export interface GmailSyncOptions {
  workspace_id: string;
  email: string;
  access_token: string;
  refresh_token: string;
  expires_at: string | null;
  last_synced_at: string | null;
  history_id: string | null;
}

export class GmailSyncService {
  private oauth2Client;
  private gmail;

  constructor(private options: GmailSyncOptions) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/email/google/callback`
    );

    this.oauth2Client.setCredentials({
      access_token: options.access_token,
      refresh_token: options.refresh_token,
      expiry_date: options.expires_at ? new Date(options.expires_at).getTime() : undefined,
    });

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  async sync() {
    console.log(`Starting sync for ${this.options.email}...`);
    
    // 1. Refresh token if needed
    const { token } = await this.oauth2Client.getAccessToken();
    if (token && token !== this.options.access_token) {
      await this.updateAccountTokens(token);
    }

    // 2. Fetch new messages
    const messages = await this.fetchNewMessages();
    console.log(`Found ${messages.length} new messages for ${this.options.email}`);

    const messagesToUpsert: any[] = [];
    for (const msg of messages) {
      if (!msg.id) continue;
      try {
        const details = await this.getMessageDetails(msg.id);
        if (details) {
          const messageData = await this.prepareMessageData(details);
          if (messageData) {
            messagesToUpsert.push(messageData);
          }
        }
      } catch (err) {
        console.error(`Error processing message ${msg.id}:`, err);
      }
    }

    // 3. Bulk upsert
    if (messagesToUpsert.length > 0) {
      const supabase = getSupabaseServerClient();
      const { error } = await supabase
        .from('emails')
        .upsert(messagesToUpsert, { onConflict: 'gmail_message_id' });

      if (error) throw error;
    }

    // 4. Update last_synced_at
    await this.updateLastSyncedAt();
    
    return messages.length;
  }

  private async fetchNewMessages() {
    let query = 'in:inbox';
    if (this.options.last_synced_at) {
      const timestamp = Math.floor(new Date(this.options.last_synced_at).getTime() / 1000);
      query += ` after:${timestamp}`;
    }

    const isFirstSync = !this.options.last_synced_at;
    const res = await this.gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: isFirstSync ? 10 : 50,
    });

    return res.data.messages || [];
  }

  private async getMessageDetails(id: string) {
    const res = await this.gmail.users.messages.get({
      userId: 'me',
      id,
      format: 'full',
    });
    return res.data;
  }

  private async prepareMessageData(gmailMsg: any) {
    const payload = gmailMsg.payload as any;
    const headers = payload.headers as any[];
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || '(No Subject)';
    const fromHeader = headers.find((h: any) => h.name === 'From')?.value || '';
    const toHeader = headers.find((h: any) => h.name === 'To')?.value || '';
    const dateHeader = headers.find((h: any) => h.name === 'Date')?.value || '';
    
    const fromEmail = this.extractEmail(fromHeader);
    const toEmail = this.extractEmail(toHeader);
    
    if (!fromEmail) return null;

    const body = this.extractBody(payload);
    const snippet = gmailMsg.snippet;

    // Detect direction
    const direction = fromEmail.toLowerCase() === this.options.email.toLowerCase() ? 'outbound' : 'inbound';
    const targetEmail = direction === 'inbound' ? fromEmail : toEmail;
    
    if (!targetEmail) return null;

    // Link to entity
    const entity = await this.findEntityByEmail(targetEmail);

    return {
      workspace_id: this.options.workspace_id,
      gmail_message_id: gmailMsg.id,
      direction,
      from_email: fromEmail,
      to_emails: toEmail,
      subject,
      html_body: body.html || body.text || '',
      text_body: body.text || '',
      snippet,
      received_at: new Date(dateHeader).toISOString(),
      entity_type: entity?.type || null,
      entity_id: entity?.id || null,
      status: direction === 'inbound' ? 'received' : 'sent',
    };
  }

  private extractEmail(header: string) {
    const match = header.match(/<(.+?)>/) || header.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
    return match ? match[1] : header;
  }

  private extractBody(payload: any): { html?: string; text?: string } {
    const result: { html?: string; text?: string } = {};

    const decodeBase64 = (data: string) => {
      if (!data) return '';
      return Buffer.from(data, 'base64').toString('utf-8');
    };

    const traverse = (part: any) => {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        result.text = decodeBase64(part.body.data);
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        result.html = decodeBase64(part.body.data);
      }

      if (part.parts) {
        part.parts.forEach(traverse);
      }
    };

    traverse(payload);
    return result;
  }

  private async findEntityByEmail(email: string) {
    const supabase = getSupabaseServerClient();

    // Check Leads
    const { data: lead } = await supabase
      .from('crm_leads')
      .select('id')
      .eq('email', email)
      .eq('workspace_id', this.options.workspace_id)
      .eq('is_deleted', false)
      .maybeSingle();

    if (lead) return { id: lead.id, type: 'lead' };

    // Check Contacts
    const { data: contact } = await supabase
      .from('crm_contacts')
      .select('id')
      .eq('email', email)
      .eq('workspace_id', this.options.workspace_id)
      .eq('is_deleted', false)
      .maybeSingle();

    if (contact) return { id: contact.id, type: 'contact' };

    return null;
  }

  private async updateAccountTokens(credentials: any) {
    const supabase = getSupabaseServerClient();
    await supabase
      .from('email_accounts')
      .update({
        access_token: credentials.access_token,
        expires_at: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null,
      } as any)
      .eq('workspace_id', this.options.workspace_id)
      .eq('email', this.options.email);
  }

  private async updateLastSyncedAt() {
    const supabase = getSupabaseServerClient();
    await supabase
      .from('email_accounts')
      .update({
        last_synced_at: new Date().toISOString(),
      } as any)
      .eq('workspace_id', this.options.workspace_id)
      .eq('email', this.options.email);
  }
}
