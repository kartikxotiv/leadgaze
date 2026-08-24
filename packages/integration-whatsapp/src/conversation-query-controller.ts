import { NextResponse } from 'next/server';

import type { SupabaseClient } from '@supabase/supabase-js';

export async function handleGetConversations(
  workspaceId: string,
  searchParams: URLSearchParams,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  const status = searchParams.get('status') ?? 'open';
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = parseInt(searchParams.get('limit') ?? '30', 10);
  const offset = (page - 1) * limit;

  let query = supabase
    .schema('core')
    .from('whatsapp_conversations')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .order('last_message_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data: conversations, count, error } = await query;

  if (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }

  // Get last messages for each conversation
  const conversationIds = (conversations ?? []).map(
    (c: { id: string }) => c.id,
  );
  let lastMessages: Record<string, unknown> = {};

  if (conversationIds.length) {
    const { data: msgs } = await supabase
      .schema('core')
      .from('whatsapp_messages')
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
  const { data: assignments } = await supabase
    .schema('core')
    .from('whatsapp_assignments')
    .select('conversation_id, assigned_to')
    .in('conversation_id', conversationIds)
    .is('unassigned_at', null);

  const assignedMap: Record<string, string> = {};
  for (const a of assignments ?? []) {
    const assignment = a as { conversation_id: string; assigned_to: string };
    assignedMap[assignment.conversation_id] = assignment.assigned_to;
  }

  const enriched = (conversations ?? []).map(
    (conv: Record<string, unknown>) => ({
      ...conv,
      last_message: lastMessages[conv.id as string] ?? null,
      assigned_to_id: assignedMap[conv.id as string] ?? null,
    }),
  );

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

  const {
    data: messages,
    count,
    error,
  } = await supabase
    .schema('core')
    .from('whatsapp_messages')
    .select('*', { count: 'exact' })
    .eq('conversation_id', conversationId)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
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
