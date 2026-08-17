import { google } from 'googleapis';
import { Buffer } from 'node:buffer';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { saveSyncedCoreEmails } from './email-sync-store';
import { findCoreEmailEntityByEmail } from './entity-linking';

const DEFAULT_GMAIL_MESSAGE_BATCH_SIZE = 10;

export interface CoreGmailSyncOptions {
  id: number;
  workspace_id: string;
  email: string;
  access_token?: string | null;
  refresh_token: string;
  expires_at?: string | null;
  last_synced_at?: string | null;
}

function headerValue(headers: any[], name: string) {
  return (
    headers.find((header) => header.name?.toLowerCase() === name.toLowerCase())
      ?.value ?? ''
  );
}

function extractEmail(header: string) {
  const match =
    header.match(/<([^>]+)>/) ||
    header.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);

  return (match?.[1] ?? header).trim().toLowerCase();
}

function decodeGmailBody(data?: string) {
  if (!data) return '';

  return Buffer.from(
    data.replace(/-/g, '+').replace(/_/g, '/'),
    'base64',
  ).toString('utf-8');
}

function extractBody(payload: any): { html?: string; text?: string } {
  const result: { html?: string; text?: string } = {};

  const visit = (part: any) => {
    if (part.mimeType === 'text/html' && part.body?.data && !result.html) {
      result.html = decodeGmailBody(part.body.data);
    }

    if (part.mimeType === 'text/plain' && part.body?.data && !result.text) {
      result.text = decodeGmailBody(part.body.data);
    }

    if (Array.isArray(part.parts)) {
      part.parts.forEach(visit);
    }
  };

  visit(payload);
  return result;
}

function extractAttachments(payload: any): any[] {
  const attachments: any[] = [];

  const visit = (part: any) => {
    if (part.filename && part.filename.length > 0 && part.body?.attachmentId) {
      attachments.push({
        name: part.filename,
        size: part.body.size || 0,
        type: part.mimeType,
        provider_attachment_id: part.body.attachmentId,
      });
    }

    if (Array.isArray(part.parts)) {
      part.parts.forEach(visit);
    }
  };

  visit(payload);
  return attachments;
}

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

function isPreparedPayload<T>(payload: T | null): payload is T {
  return payload !== null;
}

export class CoreGmailSyncService {
  private oauth2Client;
  private gmail;

  constructor(private readonly options: CoreGmailSyncOptions) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );

    this.oauth2Client.setCredentials({
      access_token: options.access_token ?? undefined,
      refresh_token: options.refresh_token,
      expiry_date: options.expires_at
        ? new Date(options.expires_at).getTime()
        : undefined,
    });

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  async sync() {
    console.log('[CoreEmailSync:Gmail] Starting sync', {
      accountId: this.options.id,
      email: this.options.email,
      workspaceId: this.options.workspace_id,
      lastSyncedAt: this.options.last_synced_at,
      firstSync: !this.options.last_synced_at,
    });

    const { token } = await this.oauth2Client.getAccessToken();
    if (token && token !== this.options.access_token) {
      await this.updateAccountTokens(token);
      console.log('[CoreEmailSync:Gmail] Refreshed access token', {
        accountId: this.options.id,
        email: this.options.email,
      });
    }

    const messages = await this.fetchMessages();
    console.log('[CoreEmailSync:Gmail] Provider returned messages', {
      accountId: this.options.id,
      email: this.options.email,
      count: messages.length,
      ids: messages
        .map((message) => message.id)
        .filter(Boolean)
        .slice(0, 10),
    });

    const payloads = await this.prepareMessages(messages);

    const savedCount = await saveSyncedCoreEmails(payloads);
    await this.updateSyncState(
      null,
      messages.length > 0 || payloads.length > 0,
    );

    console.log('[CoreEmailSync:Gmail] Sync complete', {
      accountId: this.options.id,
      email: this.options.email,
      providerCount: messages.length,
      preparedCount: payloads.length,
      savedCount,
    });

    return savedCount;
  }

  private async fetchMessages() {
    let query = '(in:inbox OR in:sent)';

    if (this.options.last_synced_at) {
      const timestamp = Math.floor(
        new Date(this.options.last_synced_at).getTime() / 1000,
      );
      query += ` after:${timestamp}`;
    }

    const response = await this.gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: this.options.last_synced_at ? 50 : 10,
    });

    console.log('[CoreEmailSync:Gmail] Gmail list query executed', {
      accountId: this.options.id,
      email: this.options.email,
      query,
      resultSizeEstimate: response.data.resultSizeEstimate,
    });

    return response.data.messages ?? [];
  }

  private async prepareMessages(messages: any[]) {
    const messageBatchSize = positiveInteger(
      process.env.CORE_EMAIL_GMAIL_MESSAGE_BATCH_SIZE,
      DEFAULT_GMAIL_MESSAGE_BATCH_SIZE,
    );
    const payloads = [];

    for (const batch of chunkArray(messages, messageBatchSize)) {
      const batchPayloads = await Promise.all(
        batch.map(async (message) => {
          if (!message.id) return null;

          const details = await this.getMessage(message.id);
          const payload = await this.toCoreEmailPayload(details);

          if (payload) {
            console.log('[CoreEmailSync:Gmail] Prepared message', {
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

            return payload;
          }

          console.warn(
            '[CoreEmailSync:Gmail] Skipped message without usable payload',
            {
              accountId: this.options.id,
              email: this.options.email,
              providerMessageId: message.id,
            },
          );

          return null;
        }),
      );

      payloads.push(...batchPayloads.filter(isPreparedPayload));
    }

    return payloads;
  }

  private async getMessage(id: string) {
    const response = await this.gmail.users.messages.get({
      userId: 'me',
      id,
      format: 'full',
    });

    return response.data;
  }

  private async toCoreEmailPayload(gmailMessage: any) {
    const payload = gmailMessage.payload ?? {};
    const headers = payload.headers ?? [];
    const fromEmail = extractEmail(headerValue(headers, 'From'));
    const toEmails = headerValue(headers, 'To')
      .split(',')
      .map(extractEmail)
      .filter(Boolean);
    const ccEmails = headerValue(headers, 'Cc')
      .split(',')
      .map(extractEmail)
      .filter(Boolean);
    const bccEmails = headerValue(headers, 'Bcc')
      .split(',')
      .map(extractEmail)
      .filter(Boolean);
    const internetMessageId = headerValue(headers, 'Message-ID');
    const inReplyTo = headerValue(headers, 'In-Reply-To');
    const references = headerValue(headers, 'References');
    const subject = headerValue(headers, 'Subject') || '(No Subject)';
    const receivedAt = headerValue(headers, 'Date')
      ? new Date(headerValue(headers, 'Date')).toISOString()
      : new Date(Number(gmailMessage.internalDate ?? Date.now())).toISOString();
    const body = extractBody(payload);
    const attachments = extractAttachments(payload);
    const direction =
      fromEmail === this.options.email.toLowerCase() ? 'outbound' : 'inbound';
    const targetEmail = direction === 'inbound' ? fromEmail : toEmails[0];
    const entity = targetEmail
      ? await findCoreEmailEntityByEmail(this.options.workspace_id, targetEmail)
      : null;

    if (!fromEmail) return null;

    return {
      workspace_id: this.options.workspace_id,
      email_account_id: this.options.id,
      provider_message_id: gmailMessage.id,
      gmail_message_id: gmailMessage.id,
      internet_message_id: internetMessageId || null,
      thread_key: gmailMessage.threadId ?? internetMessageId ?? gmailMessage.id,
      in_reply_to: inReplyTo || null,
      email_references: references || null,
      direction,
      from_email: fromEmail,
      to_email: toEmails[0] ?? null,
      to_emails: toEmails,
      cc_emails: ccEmails,
      bcc_emails: bccEmails,
      subject,
      body: body.html || body.text || '',
      html_body: body.html || null,
      text_body: body.text || null,
      snippet: gmailMessage.snippet ?? body.text?.slice(0, 200) ?? '',
      attachments,
      raw_headers: Object.fromEntries(
        headers.map((header: any) => [header.name, header.value]),
      ),
      status: direction === 'inbound' ? 'received' : 'sent',
      sent_at: direction === 'outbound' ? receivedAt : null,
      received_at: direction === 'inbound' ? receivedAt : null,
      relation: entity
        ? {
            entity_type: entity.type,
            entity_id: entity.id,
            relation_type: 'participant',
          }
        : null,
    };
  }

  private async updateAccountTokens(accessToken: string) {
    const supabase = getSupabaseServerAdminClient();

    await (supabase as any)
      .schema('core')
      .from('email_accounts')
      .update({ access_token: accessToken })
      .eq('id', this.options.id)
      .eq('workspace_id', this.options.workspace_id);
  }

  private async updateSyncState(
    error: string | null,
    shouldAdvanceLastSyncedAt = true,
  ) {
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
