/**
 * WhatsApp API Controllers
 *
 * Handles all HTTP request logic for the WhatsApp integration:
 * - Settings GET/POST (connect, disconnect, send-message, etc.)
 * - Webhook GET (verification) + POST (message events)
 * - Conversation and message CRUD
 */

import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { WhatsAppWebhookPayload, LeadCreationMode } from './types';
import {
  verifyWebhookChallenge,
  verifyWebhookSignature,
  sendTextMessage,
  sendTemplateMessage,
  markMessageAsRead,
  getPhoneNumberInfo,
  getWabaTemplates,
  exchangeWhatsAppCode,
  getOwnedWabasAndPhones,
  subscribeWabaToWebhook,
  getWabaSubscribedApps,
} from './whatsapp-provider';
import { matchOrCreateLead } from './lead-engine';

// ---------------------------------------------------------------------------
// Webhook — GET (hub challenge verification)
// ---------------------------------------------------------------------------

export function handleWhatsAppWebhookVerification(request: NextRequest): NextResponse {
  const { searchParams } = request.nextUrl;

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const { valid, challenge: ch } = verifyWebhookChallenge(mode, token, challenge);

  if (!valid || !ch) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  return new NextResponse(ch, {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}

// ---------------------------------------------------------------------------
// OAuth Callback (Embedded Signup)
// ---------------------------------------------------------------------------

export async function handleWhatsAppCallback(
  code: string,
  state: string,
  supabase: SupabaseClient,
): Promise<{ redirectUrl: string }> {
  let parsedState: { workspaceId?: string; returnUrl?: string; userId?: string } = {};
  try {
    parsedState = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
  } catch {
    return { redirectUrl: '/home/sales/workspace-settings/integrations?error=invalid_state' };
  }

  const { workspaceId, returnUrl, userId } = parsedState;
  if (!workspaceId) {
    return { redirectUrl: '/home/sales/workspace-settings/integrations?error=missing_workspace' };
  }

  try {
    // 1. Exchange code for user token
    const tokenData = await exchangeWhatsAppCode(code);
    
    // 2. Fetch all WABAs and phone numbers the user has access to
    const wabas = await getOwnedWabasAndPhones(tokenData.user_access_token);
    const now = new Date().toISOString();

    // 3. Store central connection
    let connectionId: string | null = null;
    const { data: existingConn } = await supabase
      .schema('core')
      .from('integration_connections')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('provider', 'whatsapp')
      .eq('is_deleted', false)
      .limit(1)
      .maybeSingle();

    const config = {
      access_token: tokenData.user_access_token,
      token_expires_at: new Date(tokenData.token_expires_at).toISOString(),
      meta_user_id: tokenData.user_id,
      wabas_found: wabas.length,
    };

    if (existingConn) {
      connectionId = existingConn.id;
      await supabase
        .schema('core')
        .from('integration_connections')
        .update({
          status: 'active',
          config,
          updated_at: now,
        })
        .eq('id', existingConn.id);
    } else {
      const { data: newConn, error: connErr } = await supabase
        .schema('core')
        .from('integration_connections')
        .insert({
          workspace_id: workspaceId,
          provider: 'whatsapp',
          status: 'active',
          config,
          created_by: userId,
          updated_at: now,
        })
        .select('id')
        .single();

      if (connErr) {
        console.error('[whatsapp] Error inserting connection:', connErr);
      } else if (newConn) {
        connectionId = newConn.id;
      }
    }

    let phoneAccountsCreated = 0;

    if (connectionId) {
      // 4. Store each phone number as an integration account
      for (const waba of wabas) {
        // Subscribe WABA to the app webhook so Meta sends events to our callback URL
        await subscribeWabaToWebhook(waba.waba_id, tokenData.user_access_token);

        for (const phone of waba.phones) {
          phoneAccountsCreated++;
          const displayName = phone.verified_name || phone.display_phone_number || `WhatsApp Number (${phone.id})`;
          const metadata = {
            phone_number_id: phone.id,
            phone_number: phone.display_phone_number,
            waba_id: waba.waba_id,
            display_name: phone.verified_name,
            verified_name: phone.verified_name,
            quality_rating: phone.quality_rating,
            status: phone.code_verification_status,
            access_token: tokenData.user_access_token,
          };

          const { data: existingAcc } = await supabase
            .schema('core')
            .from('integration_accounts')
            .select('id')
            .eq('workspace_id', workspaceId)
            .eq('connection_id', connectionId)
            .eq('external_account_id', phone.id)
            .maybeSingle();

          if (existingAcc) {
            await supabase
              .schema('core')
              .from('integration_accounts')
              .update({
                connection_id: connectionId,
                display_name: displayName,
                metadata,
                status: 'active',
                updated_at: now,
              })
              .eq('id', existingAcc.id);
          } else {
            const { error: accInsertErr } = await supabase
              .schema('core')
              .from('integration_accounts')
              .insert({
                workspace_id: workspaceId,
                connection_id: connectionId,
                external_account_id: phone.id,
                display_name: displayName,
                metadata,
                status: 'active',
                updated_at: now,
              });
            if (accInsertErr) {
              console.error('[whatsapp] Failed to insert integration_account for phone', phone.id, accInsertErr);
            }
          }
        }
      }
    }

    if (phoneAccountsCreated === 0) {
      console.warn(`[whatsapp] Connection stored for workspace ${workspaceId}, but 0 phone numbers were found across ${wabas.length} WABA(s).`);
    }

    // Ensure default settings exist
    await supabase.schema('core').from('whatsapp_settings')
      .upsert({ workspace_id: workspaceId }, { onConflict: 'workspace_id' });

    return { redirectUrl: returnUrl || '/home/sales/workspace-settings/integrations/whatsapp' };
  } catch (err) {
    console.error('[whatsapp] Callback error:', err);
    return { redirectUrl: `${returnUrl}?error=${encodeURIComponent((err as Error).message)}` };
  }
}

// ---------------------------------------------------------------------------
// Webhook — POST (incoming message events)
// ---------------------------------------------------------------------------

export async function handleWhatsAppWebhook(
  rawBody: string,
  signature: string | null,
  payload: WhatsAppWebhookPayload,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  // 1. Verify signature
  const isValid = await verifyWebhookSignature(rawBody, signature);
  if (!isValid) {
    console.warn('[whatsapp] Invalid webhook signature');
    // Return 200 anyway to prevent Meta from retrying
    return NextResponse.json({ ok: true });
  }

  // 2. Process events (fire-and-forget to return 200 fast)
  processWebhookPayload(payload, supabase).catch((err) =>
    console.error('[whatsapp] Webhook processing error:', err),
  );

  return NextResponse.json({ ok: true });
}

async function processWebhookPayload(
  payload: WhatsAppWebhookPayload,
  supabase: SupabaseClient,
): Promise<void> {
  if (payload.object !== 'whatsapp_business_account') return;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue;

      const value = change.value;
      const phoneNumberId = value.metadata?.phone_number_id;

      if (!phoneNumberId) continue;

      // Find the integration_accounts record for this phone_number_id.
      const { data: account } = await supabase.schema('core')
        .from('integration_accounts')
        .select('id, workspace_id, connection_id, created_by, metadata')
        .filter('metadata->>phone_number_id', 'eq', phoneNumberId)
        .eq('status', 'active')
        .maybeSingle();

      if (!account) {
        console.warn(`[whatsapp] No active account found for phone_number_id=${phoneNumberId}`);
        continue;
      }

      const workspaceId = account.workspace_id as string;
      const accountId = account.id as string;
      const metadata = account.metadata as Record<string, string>;
      const accessToken = metadata.access_token ?? '';

      // Determine created_by user ID from account or parent connection
      let createdBy = (account as { created_by?: string }).created_by;
      if (!createdBy && (account as { connection_id?: string }).connection_id) {
        const { data: conn } = await supabase.schema('core')
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
        await processIncomingMessage(msg, value, workspaceId, accountId, phoneNumberId, accessToken, createdBy, supabase);
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
): Promise<void> {
  const customerPhone = msg.from as string;
  const metaMessageId = msg.id as string;
  const timestamp = new Date(parseInt(msg.timestamp, 10) * 1000).toISOString();
  const messageType = msg.type as string;

  // Extract customer name from contacts array
  const contactProfile = value.contacts?.find(
    (c: { wa_id: string; profile: { name: string } }) => c.wa_id === customerPhone,
  );
  const customerName = contactProfile?.profile?.name as string | undefined;

  // Extract message body
  let body: string | undefined;
  let mediaId: string | undefined;
  let mediaType: string | undefined;

  if (messageType === 'text') {
    body = msg.text?.body as string;
  } else if (['image', 'video', 'audio', 'document', 'sticker'].includes(messageType)) {
    const mediaObj = msg[messageType] as Record<string, string> | undefined;
    mediaId = mediaObj?.id;
    mediaType = mediaObj?.mime_type;
    body = (mediaObj?.caption as string | undefined);
  } else if (messageType === 'location') {
    body = `📍 Location: ${msg.location?.name ?? ''} (${msg.location?.latitude},${msg.location?.longitude})`;
  } else if (messageType === 'interactive') {
    body = msg.interactive?.button_reply?.title ?? msg.interactive?.list_reply?.title ?? '[Interactive]';
  } else {
    body = '[Unsupported message type]';
  }

  // Dedup check — use maybeSingle() so a missing record returns null instead of an error
  const { data: existing } = await supabase.schema('core')
    .from('whatsapp_messages')
    .select('id')
    .eq('meta_message_id', metaMessageId)
    .maybeSingle();
  if (existing) return;

  // Get workspace settings for lead engine — use maybeSingle() in case no settings row yet
  const { data: settings } = await supabase.schema('core')
    .from('whatsapp_settings')
    .select('*')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  // Upsert conversation
  const { data: conversation } = await supabase.schema('core')
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
    console.error('[whatsapp] Failed to upsert conversation for', customerPhone);
    return;
  }

  const conversationId = (conversation as { id: string }).id;
  const messageCount = ((conversation as { message_count: number }).message_count ?? 0) + 1;

  // Set first_message on first contact
  if (!(conversation as { first_message?: string }).first_message && body) {
    await supabase.schema('core').from('whatsapp_conversations')
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
  await supabase.schema('core').from('whatsapp_conversations')
    .update({ message_count: messageCount, updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  // Run lead engine (only if not already matched)
  if (!(conversation as { lead_id?: string }).lead_id && !(conversation as { contact_id?: string }).contact_id) {
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
    );
  }

  // Send read receipt — phoneNumberId is already known from the caller, no extra DB query needed
  if (accessToken && phoneNumberId) {
    markMessageAsRead(phoneNumberId, metaMessageId, accessToken).catch(() => {});
  }
}

async function processStatusUpdate(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  status: any,
  workspaceId: string,
  supabase: SupabaseClient,
): Promise<void> {
  if (!status.id || !status.status) return;

  await supabase.schema('core').from('whatsapp_messages')
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

export async function handleGetWhatsAppSettings(
  workspaceId: string,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  // Step 1: Get the WhatsApp connection (provider-scoped)
  const { data: connection } = await supabase.schema('core').from('integration_connections')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'whatsapp')
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  // Step 2: Fetch accounts filtered by connection_id (only WhatsApp accounts),
  //         plus settings/replies/templates in parallel
  const [accountsRes, settingsRes, repliesRes, templatesRes] = await Promise.all([
    connection
      ? supabase.schema('core').from('integration_accounts')
          .select('*')
          .eq('workspace_id', workspaceId)
          .eq('connection_id', connection.id)
          .eq('status', 'active')
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] }),

    supabase.schema('core').from('whatsapp_settings')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle(),

    supabase.schema('core').from('whatsapp_saved_replies')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false }),

    supabase.schema('core').from('whatsapp_templates')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'APPROVED')
      .order('template_name'),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      connection: connection ?? null,
      accounts: accountsRes.data ?? [],
      settings: settingsRes.data ?? null,
      savedReplies: repliesRes.data ?? [],
      templates: templatesRes.data ?? [],
    },
  });
}

// ---------------------------------------------------------------------------
// Settings — POST (action dispatcher)
// ---------------------------------------------------------------------------

export async function handleMutateWhatsAppSettings(
  workspaceId: string,
  action: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any,
  userId: string,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  switch (action) {
    case 'disconnect':
      return handleDisconnect(workspaceId, body.accountId, supabase);
    case 'send-message':
      return handleSendMessage(workspaceId, body, userId, supabase);
    case 'assign-conversation':
      return handleAssignConversation(workspaceId, body, userId, supabase);
    case 'resolve-conversation':
      return handleUpdateConversationStatus(workspaceId, body.conversationId, 'resolved', supabase);
    case 'reopen-conversation':
      return handleUpdateConversationStatus(workspaceId, body.conversationId, 'open', supabase);
    case 'close-conversation':
      return handleUpdateConversationStatus(workspaceId, body.conversationId, 'closed', supabase);
    case 'add-note':
      return handleAddNote(workspaceId, body, userId, supabase);
    case 'save-reply':
      return handleSaveReply(workspaceId, body, userId, supabase);
    case 'delete-reply':
      return handleDeleteReply(workspaceId, body.replyId, supabase);
    case 'update-settings':
      return handleUpdateSettings(workspaceId, body, supabase);
    case 'sync-numbers':
      return handleSyncNumbers(workspaceId, supabase);
    case 'sync-templates':
      return handleSyncTemplates(workspaceId, body.accountId, supabase);
    case 'convert-to-lead':
      return handleConvertToLead(workspaceId, body, userId, supabase);
    case 'check-webhook-subscription':
      return handleCheckWebhookSubscription(workspaceId, body.accountId, supabase);
    default:
      return NextResponse.json({ success: false, message: `Unknown action: ${action}` }, { status: 400 });
  }
}

async function handleSyncNumbers(
  workspaceId: string,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  const { data: connection } = await supabase
    .schema('core')
    .from('integration_connections')
    .select('id, config')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'whatsapp')
    .eq('status', 'active')
    .maybeSingle();

  if (!connection || !connection.config?.access_token) {
    return NextResponse.json({ success: false, message: 'No active WhatsApp connection found' }, { status: 404 });
  }

  const accessToken = connection.config.access_token as string;
  const now = new Date().toISOString();

  try {
    const wabas = await getOwnedWabasAndPhones(accessToken);
    let phoneAccountsCreated = 0;

    for (const waba of wabas) {
      // Re-subscribe WABA to the webhook in case subscription was lost
      await subscribeWabaToWebhook(waba.waba_id, accessToken);

      for (const phone of waba.phones) {
        phoneAccountsCreated++;
        const displayName = phone.verified_name || phone.display_phone_number || `WhatsApp Number (${phone.id})`;
        const metadata = {
          phone_number_id: phone.id,
          phone_number: phone.display_phone_number,
          waba_id: waba.waba_id,
          display_name: phone.verified_name,
          verified_name: phone.verified_name,
          quality_rating: phone.quality_rating,
          status: phone.code_verification_status,
          access_token: accessToken,
        };

        const { data: existingAcc } = await supabase
          .schema('core')
          .from('integration_accounts')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('connection_id', connection.id)
          .eq('external_account_id', phone.id)
          .maybeSingle();

        if (existingAcc) {
          await supabase
            .schema('core')
            .from('integration_accounts')
            .update({
              connection_id: connection.id,
              display_name: displayName,
              metadata,
              status: 'active',
              updated_at: now,
            })
            .eq('id', existingAcc.id);
        } else {
          const { error: syncInsertErr } = await supabase
            .schema('core')
            .from('integration_accounts')
            .insert({
              workspace_id: workspaceId,
              connection_id: connection.id,
              external_account_id: phone.id,
              display_name: displayName,
              metadata,
              status: 'active',
              updated_at: now,
            });
          if (syncInsertErr) {
            console.error('[whatsapp] Failed to insert integration_account during sync for phone', phone.id, syncInsertErr);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: { synced: phoneAccountsCreated, wabasCount: wabas.length },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: (err as Error).message },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// check-webhook-subscription — debug & fix WABA subscription
// ---------------------------------------------------------------------------

async function handleCheckWebhookSubscription(
  workspaceId: string,
  accountId: string,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  const { data: account } = await supabase.schema('core').from('integration_accounts')
    .select('metadata')
    .eq('id', accountId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (!account) {
    return NextResponse.json({ success: false, message: 'Account not found' }, { status: 404 });
  }

  const meta = (account as { metadata: Record<string, string> }).metadata;
  const wabaId = meta.waba_id as string;
  const accessToken = meta.access_token as string;

  // Fetch current subscribers
  const subscribers = await getWabaSubscribedApps(wabaId, accessToken);

  // Re-subscribe to ensure it's active
  const subResult = await subscribeWabaToWebhook(wabaId, accessToken);

  return NextResponse.json({
    success: true,
    data: {
      wabaId,
      currentSubscribers: subscribers,
      resubscribeResult: subResult,
    },
  });
}

// ---------------------------------------------------------------------------
// disconnect — soft delete account
// ---------------------------------------------------------------------------

async function handleDisconnect(
  workspaceId: string,
  accountId: string,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  if (!accountId) {
    return NextResponse.json({ success: false, message: 'accountId is required' }, { status: 400 });
  }

  await supabase.schema('core').from('integration_accounts')
    .update({ status: 'inactive', updated_at: new Date().toISOString() })
    .eq('id', accountId)
    .eq('workspace_id', workspaceId);

  // If no more active accounts, deactivate the connection too
  const { data: remaining } = await supabase.schema('core').from('integration_accounts')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active');

  if (!remaining?.length) {
    // Deactivate the parent connection
    await supabase.schema('core').from('integration_connections')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .eq('provider', 'whatsapp');
  }

  return NextResponse.json({ success: true, data: { disconnected: true } });
}

// ---------------------------------------------------------------------------
// send-message
// ---------------------------------------------------------------------------

async function handleSendMessage(
  workspaceId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any,
  userId: string,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  const { conversationId, messageBody, templateName, templateLanguage, templateComponents } = body as {
    conversationId: string;
    messageBody?: string;
    templateName?: string;
    templateLanguage?: string;
    templateComponents?: unknown[];
  };

  if (!conversationId) {
    return NextResponse.json({ success: false, message: 'conversationId is required' }, { status: 400 });
  }
  if (!messageBody && !templateName) {
    return NextResponse.json({ success: false, message: 'messageBody or templateName is required' }, { status: 400 });
  }

  const { data: conv } = await supabase.schema('core').from('whatsapp_conversations')
    .select('customer_phone, account_id')
    .eq('id', conversationId)
    .eq('workspace_id', workspaceId)
    .single();

  if (!conv) {
    return NextResponse.json({ success: false, message: 'Conversation not found' }, { status: 404 });
  }

  const { data: account } = await supabase.schema('core').from('integration_accounts')
    .select('metadata')
    .eq('id', (conv as { account_id: string }).account_id)
    .single();

  if (!account) {
    return NextResponse.json({ success: false, message: 'WhatsApp account not found' }, { status: 404 });
  }

  const meta = (account as { metadata: Record<string, string> }).metadata;
  const phoneNumberId = meta.phone_number_id as string;
  const accessToken = meta.access_token as string;
  const to = (conv as { customer_phone: string }).customer_phone;

  let metaMessageId = '';

  try {
    if (templateName) {
      const result = await sendTemplateMessage(phoneNumberId, {
        to,
        templateName,
        language: templateLanguage ?? 'en_US',
        components: templateComponents,
      }, accessToken);
      metaMessageId = result.message_id;
    } else {
      const result = await sendTextMessage(phoneNumberId, { to, body: messageBody! }, accessToken);
      metaMessageId = result.message_id;
    }
  } catch (err) {
    return NextResponse.json(
      { success: false, message: (err as Error).message },
      { status: 500 },
    );
  }

  const now = new Date().toISOString();

  // Store outgoing message
  const { data: msg } = await supabase.schema('core').from('whatsapp_messages').insert({
    workspace_id: workspaceId,
    conversation_id: conversationId,
    meta_message_id: metaMessageId,
    direction: 'outgoing',
    message_type: templateName ? 'template' : 'text',
    body: messageBody,
    template_name: templateName,
    template_language: templateLanguage,
    status: 'sent',
    sent_by: userId,
    created_at: now,
    updated_at: now,
  }).select('*').single();

  // Update conversation last_message_at
  await supabase.schema('core').from('whatsapp_conversations')
    .update({ last_message_at: now, updated_at: now })
    .eq('id', conversationId);

  return NextResponse.json({ success: true, data: { message: msg } });
}

// ---------------------------------------------------------------------------
// assign-conversation
// ---------------------------------------------------------------------------

async function handleAssignConversation(
  workspaceId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any,
  userId: string,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  const { conversationId, assignTo } = body as { conversationId: string; assignTo: string | null };

  // Close previous open assignment
  await supabase.schema('core').from('whatsapp_assignments')
    .update({ unassigned_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .is('unassigned_at', null);

  if (assignTo) {
    await supabase.schema('core').from('whatsapp_assignments').insert({
      workspace_id: workspaceId,
      conversation_id: conversationId,
      assigned_to: assignTo,
      assigned_by: userId,
    });
  }

  return NextResponse.json({ success: true, data: { assigned: true } });
}

// ---------------------------------------------------------------------------
// status changes
// ---------------------------------------------------------------------------

async function handleUpdateConversationStatus(
  workspaceId: string,
  conversationId: string,
  status: string,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  const { error } = await supabase.schema('core').from('whatsapp_conversations')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', conversationId)
    .eq('workspace_id', workspaceId);

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: { status } });
}

// ---------------------------------------------------------------------------
// add-note
// ---------------------------------------------------------------------------

async function handleAddNote(
  workspaceId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any,
  userId: string,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  const { conversationId, noteBody } = body as { conversationId: string; noteBody: string };

  const { data: note } = await supabase.schema('core').from('whatsapp_notes').insert({
    workspace_id: workspaceId,
    conversation_id: conversationId,
    created_by: userId,
    body: noteBody,
  }).select('*').single();

  return NextResponse.json({ success: true, data: { note } });
}

// ---------------------------------------------------------------------------
// save-reply / delete-reply
// ---------------------------------------------------------------------------

async function handleSaveReply(
  workspaceId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any,
  userId: string,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  const { title, replyBody } = body as { title: string; replyBody: string };

  const { data: reply } = await supabase.schema('core').from('whatsapp_saved_replies').insert({
    workspace_id: workspaceId,
    title,
    body: replyBody,
    created_by: userId,
  }).select('*').single();

  return NextResponse.json({ success: true, data: { reply } });
}

async function handleDeleteReply(
  workspaceId: string,
  replyId: string,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  await supabase.schema('core').from('whatsapp_saved_replies')
    .delete()
    .eq('id', replyId)
    .eq('workspace_id', workspaceId);

  return NextResponse.json({ success: true });
}

// ---------------------------------------------------------------------------
// update-settings
// ---------------------------------------------------------------------------

async function handleUpdateSettings(
  workspaceId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  const { leadCreationMode, leadKeywords, leadMessageThreshold } = body as {
    leadCreationMode?: LeadCreationMode;
    leadKeywords?: string[];
    leadMessageThreshold?: number;
  };

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (leadCreationMode) update.lead_creation_mode = leadCreationMode;
  if (leadKeywords) update.lead_keywords = leadKeywords;
  if (leadMessageThreshold !== undefined) update.lead_message_threshold = leadMessageThreshold;

  await supabase.schema('core').from('whatsapp_settings')
    .upsert({ workspace_id: workspaceId, ...update }, { onConflict: 'workspace_id' });

  return NextResponse.json({ success: true });
}

// ---------------------------------------------------------------------------
// sync-templates
// ---------------------------------------------------------------------------

async function handleSyncTemplates(
  workspaceId: string,
  accountId: string,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  const { data: account } = await supabase.schema('core').from('integration_accounts')
    .select('metadata')
    .eq('id', accountId)
    .eq('workspace_id', workspaceId)
    .single();

  if (!account) {
    return NextResponse.json({ success: false, message: 'Account not found' }, { status: 404 });
  }

  const meta = (account as { metadata: Record<string, string> }).metadata;
  const wabaId = meta.waba_id as string;
  const accessToken = meta.access_token as string;

  try {
    const templates = await getWabaTemplates(wabaId, accessToken);

    // Upsert all templates
    for (const t of templates) {
      await supabase.schema('core').from('whatsapp_templates').upsert(
        {
          workspace_id: workspaceId,
          account_id: accountId,
          meta_template_id: t.meta_template_id ?? '',
          template_name: t.template_name ?? '',
          language: t.language ?? 'en_US',
          category: t.category ?? 'MARKETING',
          template_payload: t.template_payload,
          status: t.status ?? 'PENDING',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'workspace_id,account_id,meta_template_id' },
      );
    }

    return NextResponse.json({ success: true, data: { synced: templates.length } });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: (err as Error).message },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// convert-to-lead (manual one-click from inbox)
// ---------------------------------------------------------------------------

async function handleConvertToLead(
  workspaceId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any,
  userId: string,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  const { conversationId } = body as { conversationId: string };

  const { data: conv } = await supabase.schema('core').from('whatsapp_conversations')
    .select('customer_phone, customer_name, lead_id')
    .eq('id', conversationId)
    .eq('workspace_id', workspaceId)
    .single();

  if (!conv) {
    return NextResponse.json({ success: false, message: 'Conversation not found' }, { status: 404 });
  }

  const c = conv as { customer_phone: string; customer_name?: string; lead_id?: string };

  if (c.lead_id) {
    return NextResponse.json({ success: false, message: 'Conversation is already linked to a lead' }, { status: 400 });
  }

  const now = new Date().toISOString();

  // Look up the leads module id for scoped status lookup
  const { data: moduleRow } = await supabase
    .from('crm_modules')
    .select('id')
    .eq('module_key', 'leads')
    .maybeSingle();

  // Get status for leads module in this workspace
  let statusQuery = supabase
    .from('entity_statuses')
    .select('id, status_key, is_default, sort_order')
    .eq('workspace_id', workspaceId);

  if (moduleRow) statusQuery = statusQuery.eq('module_id', (moduleRow as { id: string }).id);

  let { data: statuses } = await statusQuery.order('sort_order', { ascending: true });

  if (!statuses || statuses.length === 0) {
    try {
      await supabase.rpc('initialize_workspace_crm_data', { p_workspace_id: workspaceId });
    } catch {
      // ignore RPC failure
    }
    const retryRes = await statusQuery.order('sort_order', { ascending: true });
    statuses = retryRes.data;
  }

  const statusRow =
    statuses?.find((s) => s.status_key === 'new') ||
    statuses?.find((s) => s.is_default) ||
    statuses?.[0];

  if (!statusRow) {
    return NextResponse.json({ success: false, message: 'Could not find lead status for workspace' }, { status: 500 });
  }

  // Get 'social_media' source id (WhatsApp) — optional
  const { data: sourceRow } = await supabase
    .from('lead_sources')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('source_key', 'social_media')
    .maybeSingle();

  // Split customer name into first/last
  const nameParts = (c.customer_name ?? c.customer_phone).trim().split(' ');
  const firstName = nameParts[0] ?? c.customer_phone;
  const lastName = nameParts.slice(1).join(' ') || null;

  // crm_leads is in the public schema
  const { data: lead, error } = await supabase
    .from('crm_leads')
    .insert({
      workspace_id: workspaceId,
      first_name: firstName,
      last_name: lastName,
      phone_number: `+${c.customer_phone}`,
      status_id: (statusRow as { id: string }).id,
      source_id: sourceRow ? (sourceRow as { id: string }).id : null,
      created_by: userId,
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();

  if (error || !lead) {
    return NextResponse.json({ success: false, message: error?.message ?? 'Lead creation failed' }, { status: 500 });
  }

  await supabase.schema('core').from('whatsapp_conversations')
    .update({ lead_id: (lead as { id: string }).id, updated_at: now })
    .eq('id', conversationId);

  return NextResponse.json({ success: true, data: { leadId: (lead as { id: string }).id } });
}

// ---------------------------------------------------------------------------
// Conversation list
// ---------------------------------------------------------------------------

export async function handleGetConversations(
  workspaceId: string,
  searchParams: URLSearchParams,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  const status = searchParams.get('status') ?? 'open';
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = parseInt(searchParams.get('limit') ?? '30', 10);
  const offset = (page - 1) * limit;

  let query = supabase.schema('core').from('whatsapp_conversations')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .order('last_message_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data: conversations, count, error } = await query;

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  // Get last messages for each conversation
  const conversationIds = (conversations ?? []).map((c: { id: string }) => c.id);
  let lastMessages: Record<string, unknown> = {};

  if (conversationIds.length) {
    const { data: msgs } = await supabase.schema('core').from('whatsapp_messages')
      .select('*')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false });

    // Group by conversation — take first (most recent) per conversation
    for (const msg of msgs ?? []) {
      const m = msg as { conversation_id: string };
      if (!lastMessages[m.conversation_id]) {
        lastMessages[m.conversation_id] = msg;
      }
    }
  }

  // Get current assignments
  const { data: assignments } = await supabase.schema('core').from('whatsapp_assignments')
    .select('conversation_id, assigned_to')
    .in('conversation_id', conversationIds)
    .is('unassigned_at', null);

  const assignedMap: Record<string, string> = {};
  for (const a of assignments ?? []) {
    const assignment = a as { conversation_id: string; assigned_to: string };
    assignedMap[assignment.conversation_id] = assignment.assigned_to;
  }

  const enriched = (conversations ?? []).map((conv: Record<string, unknown>) => ({
    ...conv,
    last_message: lastMessages[conv.id as string] ?? null,
    assigned_to_id: assignedMap[conv.id as string] ?? null,
  }));

  return NextResponse.json({
    success: true,
    data: {
      conversations: enriched,
      total: count ?? 0,
      hasMore: (count ?? 0) > offset + limit,
    },
  });
}

// ---------------------------------------------------------------------------
// Messages in a conversation
// ---------------------------------------------------------------------------

export async function handleGetMessages(
  workspaceId: string,
  conversationId: string,
  searchParams: URLSearchParams,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = parseInt(searchParams.get('limit') ?? '50', 10);
  const offset = (page - 1) * limit;

  const { data: messages, count, error } = await supabase.schema('core')
    .from('whatsapp_messages')
    .select('*', { count: 'exact' })
    .eq('conversation_id', conversationId)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: {
      messages: messages ?? [],
      total: count ?? 0,
      hasMore: (count ?? 0) > offset + limit,
    },
  });
}
