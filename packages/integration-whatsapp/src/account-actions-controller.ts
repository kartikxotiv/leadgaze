import { NextResponse } from 'next/server';

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  getOwnedWabasAndPhones,
  getPhoneNumberInfo,
  getWabaSubscribedApps,
  subscribeWabaToWebhook,
} from './whatsapp-provider';

export async function handleSyncNumbers(
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
    return NextResponse.json(
      { success: false, message: 'No active WhatsApp connection found' },
      { status: 404 },
    );
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
        const displayName =
          phone.verified_name ||
          phone.display_phone_number ||
          `WhatsApp Number (${phone.id})`;
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
            console.error(
              '[whatsapp] Failed to insert integration_account during sync for phone',
              phone.id,
              syncInsertErr,
            );
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

export async function handleCheckWebhookSubscription(
  workspaceId: string,
  accountId: string,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  const { data: account } = await supabase
    .schema('core')
    .from('integration_accounts')
    .select('metadata')
    .eq('id', accountId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (!account) {
    return NextResponse.json(
      { success: false, message: 'Account not found' },
      { status: 404 },
    );
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

export async function handleDisconnect(
  workspaceId: string,
  accountId: string,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  if (!accountId) {
    return NextResponse.json(
      { success: false, message: 'accountId is required' },
      { status: 400 },
    );
  }

  await supabase
    .schema('core')
    .from('integration_accounts')
    .update({ status: 'inactive', updated_at: new Date().toISOString() })
    .eq('id', accountId)
    .eq('workspace_id', workspaceId);

  // If no more active accounts, deactivate the connection too
  const { data: remaining } = await supabase
    .schema('core')
    .from('integration_accounts')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active');

  if (!remaining?.length) {
    // Deactivate the parent connection
    await supabase
      .schema('core')
      .from('integration_connections')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .eq('provider', 'whatsapp');
  }

  return NextResponse.json({ success: true, data: { disconnected: true } });
}

// ---------------------------------------------------------------------------
// send-message
// ---------------------------------------------------------------------------
