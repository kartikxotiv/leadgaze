import { NextResponse } from 'next/server';

import type { SupabaseClient } from '@supabase/supabase-js';

import { sendTemplateMessage, sendTextMessage } from './whatsapp-provider';

export async function handleSendMessage(
  workspaceId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any,
  userId: string,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  const {
    conversationId,
    messageBody,
    templateName,
    templateLanguage,
    templateComponents,
  } = body as {
    conversationId: string;
    messageBody?: string;
    templateName?: string;
    templateLanguage?: string;
    templateComponents?: unknown[];
  };

  if (!conversationId) {
    return NextResponse.json(
      { success: false, message: 'conversationId is required' },
      { status: 400 },
    );
  }
  if (!messageBody && !templateName) {
    return NextResponse.json(
      { success: false, message: 'messageBody or templateName is required' },
      { status: 400 },
    );
  }

  const { data: conv } = await supabase
    .schema('core')
    .from('whatsapp_conversations')
    .select('customer_phone, account_id')
    .eq('id', conversationId)
    .eq('workspace_id', workspaceId)
    .single();

  if (!conv) {
    return NextResponse.json(
      { success: false, message: 'Conversation not found' },
      { status: 404 },
    );
  }

  const { data: account } = await supabase
    .schema('core')
    .from('integration_accounts')
    .select('metadata')
    .eq('id', (conv as { account_id: string }).account_id)
    .single();

  if (!account) {
    return NextResponse.json(
      { success: false, message: 'WhatsApp account not found' },
      { status: 404 },
    );
  }

  const meta = (account as { metadata: Record<string, string> }).metadata;
  const phoneNumberId = meta.phone_number_id as string;
  const accessToken = meta.access_token as string;
  const to = (conv as { customer_phone: string }).customer_phone;

  let metaMessageId = '';

  try {
    if (templateName) {
      const result = await sendTemplateMessage(
        phoneNumberId,
        {
          to,
          templateName,
          language: templateLanguage ?? 'en_US',
          components: templateComponents,
        },
        accessToken,
      );
      metaMessageId = result.message_id;
    } else {
      const result = await sendTextMessage(
        phoneNumberId,
        { to, body: messageBody! },
        accessToken,
      );
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
  const { data: msg } = await supabase
    .schema('core')
    .from('whatsapp_messages')
    .insert({
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
    })
    .select('*')
    .single();

  // Update conversation last_message_at
  await supabase
    .schema('core')
    .from('whatsapp_conversations')
    .update({ last_message_at: now, updated_at: now })
    .eq('id', conversationId);

  return NextResponse.json({ success: true, data: { message: msg } });
}

// ---------------------------------------------------------------------------
// assign-conversation
// ---------------------------------------------------------------------------

export async function handleAssignConversation(
  workspaceId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any,
  userId: string,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  const { conversationId, assignTo } = body as {
    conversationId: string;
    assignTo: string | null;
  };

  // Close previous open assignment
  await supabase
    .schema('core')
    .from('whatsapp_assignments')
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

export async function handleUpdateConversationStatus(
  workspaceId: string,
  conversationId: string,
  status: string,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  const { error } = await supabase
    .schema('core')
    .from('whatsapp_conversations')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', conversationId)
    .eq('workspace_id', workspaceId);

  if (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, data: { status } });
}

// ---------------------------------------------------------------------------
// add-note
// ---------------------------------------------------------------------------

export async function handleAddNote(
  workspaceId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any,
  userId: string,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  const { conversationId, noteBody } = body as {
    conversationId: string;
    noteBody: string;
  };

  const { data: note } = await supabase
    .schema('core')
    .from('whatsapp_notes')
    .insert({
      workspace_id: workspaceId,
      conversation_id: conversationId,
      created_by: userId,
      body: noteBody,
    })
    .select('*')
    .single();

  return NextResponse.json({ success: true, data: { note } });
}

// ---------------------------------------------------------------------------
// save-reply / delete-reply
// ---------------------------------------------------------------------------

export async function handleSaveReply(
  workspaceId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any,
  userId: string,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  const { title, replyBody } = body as { title: string; replyBody: string };

  const { data: reply } = await supabase
    .schema('core')
    .from('whatsapp_saved_replies')
    .insert({
      workspace_id: workspaceId,
      title,
      body: replyBody,
      created_by: userId,
    })
    .select('*')
    .single();

  return NextResponse.json({ success: true, data: { reply } });
}

export async function handleDeleteReply(
  workspaceId: string,
  replyId: string,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  await supabase
    .schema('core')
    .from('whatsapp_saved_replies')
    .delete()
    .eq('id', replyId)
    .eq('workspace_id', workspaceId);

  return NextResponse.json({ success: true });
}

// ---------------------------------------------------------------------------
// update-settings
// ---------------------------------------------------------------------------
