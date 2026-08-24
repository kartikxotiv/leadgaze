import {
  exchangeGoogleAdsCode,
  getGoogleAdsCustomerAccounts,
} from './google-ads-provider';

export async function handleGoogleAdsCallback(
  code: string,
  rawState: string,
  supabase: any,
): Promise<{ redirectUrl: string }> {
  let workspaceId = '';
  let userId = '';
  let returnUrl = '/home/sales/workspace-settings/integrations/google-ads';

  try {
    const state = JSON.parse(Buffer.from(rawState, 'base64').toString('utf-8'));
    workspaceId = state.workspaceId ?? '';
    userId = state.userId ?? '';
    returnUrl = state.returnUrl ?? returnUrl;
  } catch {
    return {
      redirectUrl: `/home/sales/workspace-settings?error=invalid_state`,
    };
  }

  if (!workspaceId) {
    return {
      redirectUrl: `/home/sales/workspace-settings?error=missing_workspace`,
    };
  }

  try {
    const tokens = await exchangeGoogleAdsCode(code);

    if (!tokens.email) {
      return { redirectUrl: `${returnUrl}?error=missing_email` };
    }

    // 1. Get or create parent connection record
    let connectionId = '';
    const { data: existingConn } = await supabase
      .schema('core')
      .from('integration_connections')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('provider', 'google_ads')
      .eq('is_deleted', false)
      .maybeSingle();

    if (existingConn) {
      connectionId = existingConn.id;
    } else {
      const { data: newConn, error: connErr } = await supabase
        .schema('core')
        .from('integration_connections')
        .insert({
          workspace_id: workspaceId,
          provider: 'google_ads',
          status: 'active',
          config: {},
          is_deleted: false,
          created_by: userId,
          updated_by: userId,
        })
        .select('id')
        .single();

      if (connErr || !newConn) {
        console.error(
          '[integration-google-ads] Failed to create connection parent:',
          connErr,
        );
        return { redirectUrl: `${returnUrl}?error=db_error` };
      }
      connectionId = newConn.id;
    }

    // Fetch initial customer accounts list
    let customerAccounts: unknown[] = [];
    try {
      customerAccounts = await getGoogleAdsCustomerAccounts(
        tokens.access_token,
      );
    } catch (e) {
      console.warn(
        '[integration-google-ads] Could not fetch accounts on connect:',
        e,
      );
    }

    const metadata = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at,
      customer_accounts: customerAccounts,
    };

    // 2. Upsert the individual Google account record in integration_accounts
    const { data: existingAccount } = await supabase
      .schema('core')
      .from('integration_accounts')
      .select('id')
      .eq('connection_id', connectionId)
      .eq('external_account_id', tokens.email)
      .eq('is_deleted', false)
      .maybeSingle();

    if (existingAccount) {
      const { error } = await supabase
        .schema('core')
        .from('integration_accounts')
        .update({
          metadata,
          status: 'active',
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingAccount.id);

      if (error) {
        console.error(
          '[integration-google-ads] Failed to update integration account:',
          error,
        );
        return { redirectUrl: `${returnUrl}?error=db_error` };
      }
    } else {
      const { error } = await supabase
        .schema('core')
        .from('integration_accounts')
        .insert({
          workspace_id: workspaceId,
          connection_id: connectionId,
          external_account_id: tokens.email,
          email: tokens.email,
          display_name: tokens.email,
          metadata,
          status: 'active',
          owner_user_id: userId,
          access_scope: 'workspace',
          created_by: userId,
          updated_by: userId,
        });

      if (error) {
        console.error(
          '[integration-google-ads] Failed to insert integration account:',
          error,
        );
        return { redirectUrl: `${returnUrl}?error=db_error` };
      }
    }

    return { redirectUrl: `${returnUrl}?connected=true` };
  } catch (e) {
    console.error('[integration-google-ads] OAuth callback failed:', e);
    return { redirectUrl: `${returnUrl}?error=auth_failed` };
  }
}
