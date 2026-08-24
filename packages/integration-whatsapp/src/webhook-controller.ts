import { NextResponse } from 'next/server';

import type { SupabaseClient } from '@supabase/supabase-js';

import { matchOrCreateLead } from './lead-engine';
import type { WhatsAppWebhookPayload } from './types';
import { markMessageAsRead, verifyWebhookSignature } from './whatsapp-provider';

export async function handleWhatsAppWebhook(
  rawBody: string,
  signature: string | null,
  payload: WhatsAppWebhookPayload,
  supabase: SupabaseClient,
  hooks?: {
    beforeCreateLead?: (workspaceId: string) => Promise<{
      commit(resourceId: string): Promise<void>;
      rollback(): Promise<void>;
    }>;
  },
): Promise<NextResponse> {
  // 1. Verify signature
  const isValid = await verifyWebhookSignature(rawBody, signature);
  if (!isValid) {
    console.warn('[whatsapp] Invalid webhook signature');
    // Return 200 anyway to prevent Meta from retrying
    return NextResponse.json({ ok: true });
  }

  // 2. Process events (fire-and-forget to return 200 fast)
  processWebhookPayload(payload, supabase, hooks).catch((err) =>
    console.error('[whatsapp] Webhook processing error:', err),
  );

  return NextResponse.json({ ok: true });
}

async function processWebhookPayload(
  payload: WhatsAppWebhookPayload,
  supabase: SupabaseClient,
  hooks?: {
    beforeCreateLead?: (workspaceId: string) => Promise<{
      commit(resourceId: string): Promise<void>;
      rollback(): Promise<void>;
    }>;
  },
): Promise<void> {
  if (payload.object !== 'whatsapp_business_account') return;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue;

      const value = change.value;
      const phoneNumberId = value.metadata?.phone_number_id;

      if (!phoneNumberId) continue;

      // Find the integration_accounts record for this phone_number_id.
      const { data: account } = await supabase
        .schema('core')
        .from('integration_accounts')
        .select('id, workspace_id, connection_id, created_by, metadata')
        .filter('metadata->>phone_number_id', 'eq', phoneNumberId)
        .eq('status', 'active')
        .maybeSingle();

      if (!account) {
        console.warn(
          `[whatsapp] No active account found for phone_number_id=${phoneNumberId}`,
        );
        continue;
      }

      const workspaceId = account.workspace_id as string;
      const accountId = account.id as string;
      const metadata = account.metadata as Record<string, string>;
      const accessToken = metadata.access_token ?? '';

      // Determine created_by user ID from account or parent connection
      let createdBy = (account as { created_by?: string }).created_by;
      if (!createdBy && (account as { connection_id?: string }).connection_id) {
        const { data: conn } = await supabase
          .schema('core')
          .from('integration_connections')
          .select('created_by')
          .eq('id', (account as { connection_id: string }).connection_id)
          .maybeSingle();
        if (conn?.created_by) {
          createdBy = conn.created_by;
        }
      }

      // Handle incoming messages
      for (const msg of value.messages ?? []) {
        await processIncomingMessage(
          msg,
          value,
          workspaceId,
          accountId,
          phoneNumberId,
          accessToken,
          createdBy,
          supabase,
          hooks,
        );
      }

      // Handle status updates (delivered, read)
      for (const status of value.statuses ?? []) {
        await processStatusUpdate(status, workspaceId, supabase);
      }
    }
  }
}

async function processIncomingMessage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  msg: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any,
  workspaceId: string,
  accountId: string,
  phoneNumberId: string,
  accessToken: string,
  createdBy: string | undefined,
  supabase: SupabaseClient,
  hooks?: {
    beforeCreateLead?: (workspaceId: string) => Promise<{
      commit(resourceId: string): Promise<void>;
      rollback(): Promise<void>;
    }>;
  },
): Promise<void> {
  const customerPhone = msg.from as string;
  const metaMessageId = msg.id as string;
  const timestamp = new Date(parseInt(msg.timestamp, 10) * 1000).toISOString();
  const messageType = msg.type as string;

  // Extract customer name from contacts array
  const contactProfile = value.contacts?.find(
    (c: { wa_id: string; profile: { name: string } }) =>
      c.wa_id === customerPhone,
  );
  const customerName = contactProfile?.profile?.name as string | undefined;

  // Extract message body
  let body: string | undefined;
  let mediaId: string | undefined;
  let mediaType: string | undefined;

  if (messageType === 'text') {
    body = msg.text?.body as string;
  } else if (
    ['image', 'video', 'audio', 'document', 'sticker'].includes(messageType)
  ) {
    const mediaObj = msg[messageType] as Record<string, string> | undefined;
    mediaId = mediaObj?.id;
    mediaType = mediaObj?.mime_type;
    body = mediaObj?.caption as string | undefined;
  } else if (messageType === 'location') {
    body = `📍 Location: ${msg.location?.name ?? ''} (${msg.location?.latitude},${msg.location?.longitude})`;
  } else if (messageType === 'interactive') {
    body =
      msg.interactive?.button_reply?.title ??
      msg.interactive?.list_reply?.title ??
      '[Interactive]';
  } else {
    body = '[Unsupported message type]';
  }

  // Dedup check — use maybeSingle() so a missing record returns null instead of an error
  const { data: existing } = await supabase
    .schema('core')
    .from('whatsapp_messages')
    .select('id')
    .eq('meta_message_id', metaMessageId)
    .maybeSingle();
  if (existing) return;

  // Get workspace settings for lead engine — use maybeSingle() in case no settings row yet
  const { data: settings } = await supabase
    .schema('core')
    .from('whatsapp_settings')
    .select('*')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  // Upsert conversation
  const { data: conversation } = await supabase
    .schema('core')
    .from('whatsapp_conversations')
    .upsert(
      {
        workspace_id: workspaceId,
        account_id: accountId,
        customer_phone: customerPhone,
        customer_name: customerName,
        status: 'open',
        last_customer_message_at: timestamp,
        last_message_at: timestamp,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'workspace_id,account_id,customer_phone',
        ignoreDuplicates: false,
      },
    )
    .select('id, message_count, first_message, lead_id, contact_id')
    .single();

  if (!conversation) {
    console.error(
      '[whatsapp] Failed to upsert conversation for',
      customerPhone,
    );
    return;
  }

  const conversationId = (conversation as { id: string }).id;
  const messageCount =
    ((conversation as { message_count: number }).message_count ?? 0) + 1;

  // Set first_message on first contact
  if (!(conversation as { first_message?: string }).first_message && body) {
    await supabase
      .schema('core')
      .from('whatsapp_conversations')
      .update({ first_message: body.slice(0, 255) })
      .eq('id', conversationId);
  }

  // Insert message
  await supabase.schema('core').from('whatsapp_messages').insert({
    workspace_id: workspaceId,
    conversation_id: conversationId,
    meta_message_id: metaMessageId,
    direction: 'incoming',
    message_type: messageType,
    body,
    meta_media_id: mediaId,
    media_type: mediaType,
    status: 'delivered',
    created_at: timestamp,
    updated_at: timestamp,
  });

  // Increment message count
  await supabase
    .schema('core')
    .from('whatsapp_conversations')
    .update({
      message_count: messageCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId);

  // Run lead engine (only if not already matched)
  if (
    !(conversation as { lead_id?: string }).lead_id &&
    !(conversation as { contact_id?: string }).contact_id
  ) {
    await matchOrCreateLead(
      {
        phone: customerPhone,
        customerName,
        messageBody: body ?? '',
        conversationId,
        messageCount,
        workspaceId,
        createdBy,
        settings: settings ?? null,
      },
      supabase,
      hooks,
    );
  }

  // Send read receipt — phoneNumberId is already known from the caller, no extra DB query needed
  if (accessToken && phoneNumberId) {
    markMessageAsRead(phoneNumberId, metaMessageId, accessToken).catch(
      () => {},
    );
  }
}

async function processStatusUpdate(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  status: any,
  workspaceId: string,
  supabase: SupabaseClient,
): Promise<void> {
  if (!status.id || !status.status) return;

  await supabase
    .schema('core')
    .from('whatsapp_messages')
    .update({
      status: status.status,
      updated_at: new Date().toISOString(),
    })
    .eq('meta_message_id', status.id)
    .eq('workspace_id', workspaceId);
}

// ---------------------------------------------------------------------------
// Settings — GET
// ---------------------------------------------------------------------------
