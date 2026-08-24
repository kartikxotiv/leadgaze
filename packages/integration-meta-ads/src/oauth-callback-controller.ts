import {
  exchangeMetaAdsCode,
  fetchMetaBusinesses,
  fetchMetaPages,
  subscribePageToApp,
} from './meta-ads-provider';

export async function handleMetaAdsCallback(
  code: string,
  rawState: string,
  supabase: any,
): Promise<{ redirectUrl: string }> {
  let workspaceId = '';
  let userId = '';
  let returnUrl = '/home/sales/workspace-settings/integrations/meta-ads';

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
    const tokens = await exchangeMetaAdsCode(code);

    // 1. Get or create parent connection record
    let connectionId = '';
    const { data: existingConn } = await supabase
      .schema('core')
      .from('integration_connections')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('provider', 'meta_ads')
      .eq('is_deleted', false)
      .maybeSingle();

    if (existingConn) {
      connectionId = existingConn.id;

      // Update the token on the parent connection
      await supabase
        .schema('core')
        .from('integration_connections')
        .update({
          status: 'active',
          config: {
            user_access_token: tokens.user_access_token,
            token_expires_at: tokens.token_expires_at,
            user_id: tokens.user_id,
            user_name: tokens.user_name,
          },
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', connectionId);
    } else {
      const { data: newConn, error: connErr } = await supabase
        .schema('core')
        .from('integration_connections')
        .insert({
          workspace_id: workspaceId,
          provider: 'meta_ads',
          status: 'active',
          config: {
            user_access_token: tokens.user_access_token,
            token_expires_at: tokens.token_expires_at,
            user_id: tokens.user_id,
            user_name: tokens.user_name,
          },
          is_deleted: false,
          created_by: userId,
          updated_by: userId,
        })
        .select('id')
        .single();

      if (connErr || !newConn) {
        console.error(
          '[integration-meta-ads] Failed to create connection:',
          connErr,
        );
        return { redirectUrl: `${returnUrl}?error=db_error` };
      }
      connectionId = newConn.id;
    }

    // 2. Fetch all pages and store them as integration_accounts
    let pages: Awaited<ReturnType<typeof fetchMetaPages>> = [];
    try {
      pages = await fetchMetaPages(tokens.user_access_token);
    } catch (e) {
      console.warn(
        '[integration-meta-ads] Could not fetch pages on connect:',
        e,
      );
    }

    // Fetch businesses too (non-fatal)
    let businesses: Awaited<ReturnType<typeof fetchMetaBusinesses>> = [];
    try {
      businesses = await fetchMetaBusinesses(tokens.user_access_token);
    } catch {
      // non-fatal
    }

    // 3. Upsert one integration_account per page
    for (const page of pages) {
      // Check if this page is already connected
      const { data: existingPage } = await supabase
        .schema('core')
        .from('integration_accounts')
        .select('id')
        .eq('connection_id', connectionId)
        .eq('external_account_id', page.page_id)
        .eq('is_deleted', false)
        .maybeSingle();

      const metadata = {
        page_id: page.page_id,
        page_name: page.page_name,
        page_access_token: page.page_access_token,
        category: page.category,
        businesses,
      };

      if (existingPage) {
        await supabase
          .schema('core')
          .from('integration_accounts')
          .update({
            metadata,
            status: 'active',
            display_name: page.page_name,
            updated_by: userId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingPage.id);
      } else {
        await supabase.schema('core').from('integration_accounts').insert({
          workspace_id: workspaceId,
          connection_id: connectionId,
          external_account_id: page.page_id,
          display_name: page.page_name,
          email: null,
          metadata,
          status: 'active',
          owner_user_id: userId,
          access_scope: 'workspace',
          created_by: userId,
          updated_by: userId,
        });
      }

      // Auto-subscribe page to receive lead notifications
      try {
        await subscribePageToApp(page.page_id, page.page_access_token);
      } catch (e) {
        console.warn(
          `[integration-meta-ads] Auto-subscribe failed for page ${page.page_id}:`,
          e,
        );
      }
    }

    return { redirectUrl: `${returnUrl}?connected=true` };
  } catch (e) {
    console.error('[integration-meta-ads] OAuth callback failed:', e);
    return { redirectUrl: `${returnUrl}?error=auth_failed` };
  }
}
