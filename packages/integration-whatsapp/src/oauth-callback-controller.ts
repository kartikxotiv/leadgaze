import type { SupabaseClient } from '@supabase/supabase-js';

import {
  exchangeWhatsAppCode,
  getOwnedWabasAndPhones,
  subscribeWabaToWebhook,
} from './whatsapp-provider';

export async function handleWhatsAppCallback(
  code: string,
  state: string,
  supabase: SupabaseClient,
): Promise<{ redirectUrl: string }> {
  let parsedState: {
    workspaceId?: string;
    returnUrl?: string;
    userId?: string;
  } = {};
  try {
    parsedState = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
  } catch {
    return {
      redirectUrl:
        '/home/sales/workspace-settings/integrations?error=invalid_state',
    };
  }

  const { workspaceId, returnUrl, userId } = parsedState;
  if (!workspaceId) {
    return {
      redirectUrl:
        '/home/sales/workspace-settings/integrations?error=missing_workspace',
    };
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
              console.error(
                '[whatsapp] Failed to insert integration_account for phone',
                phone.id,
                accInsertErr,
              );
            }
          }
        }
      }
    }

    if (phoneAccountsCreated === 0) {
      console.warn(
        `[whatsapp] Connection stored for workspace ${workspaceId}, but 0 phone numbers were found across ${wabas.length} WABA(s).`,
      );
    }

    // Ensure default settings exist
    await supabase
      .schema('core')
      .from('whatsapp_settings')
      .upsert({ workspace_id: workspaceId }, { onConflict: 'workspace_id' });

    return {
      redirectUrl:
        returnUrl || '/home/sales/workspace-settings/integrations/whatsapp',
    };
  } catch (err) {
    console.error('[whatsapp] Callback error:', err);
    return {
      redirectUrl: `${returnUrl}?error=${encodeURIComponent((err as Error).message)}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Webhook — POST (incoming message events)
// ---------------------------------------------------------------------------
