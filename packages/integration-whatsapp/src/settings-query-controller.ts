import { NextResponse } from 'next/server';

import type { SupabaseClient } from '@supabase/supabase-js';

export async function handleGetWhatsAppSettings(
  workspaceId: string,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  // Step 1: Get the WhatsApp connection (provider-scoped)
  const { data: connection } = await supabase
    .schema('core')
    .from('integration_connections')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'whatsapp')
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  // Step 2: Fetch accounts filtered by connection_id (only WhatsApp accounts),
  //         plus settings/replies/templates in parallel
  const [accountsRes, settingsRes, repliesRes, templatesRes] =
    await Promise.all([
      connection
        ? supabase
            .schema('core')
            .from('integration_accounts')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('connection_id', connection.id)
            .eq('status', 'active')
            .order('created_at', { ascending: true })
        : Promise.resolve({ data: [] }),

      supabase
        .schema('core')
        .from('whatsapp_settings')
        .select('*')
        .eq('workspace_id', workspaceId)
        .maybeSingle(),

      supabase
        .schema('core')
        .from('whatsapp_saved_replies')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false }),

      supabase
        .schema('core')
        .from('whatsapp_templates')
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
