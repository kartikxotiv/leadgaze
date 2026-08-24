import { NextResponse } from 'next/server';

import type { MetaAdsSettingsData } from './types';

export async function handleGetMetaAdsSettings(
  workspaceId: string,
  supabase: any,
): Promise<NextResponse> {
  // 1. Fetch parent connection first (needed to scope pages query)
  const { data: connectionData } = await supabase
    .schema('core')
    .from('integration_connections')
    .select('id, status, config, created_at, updated_at')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'meta_ads')
    .eq('is_deleted', false)
    .maybeSingle();

  const connectionId =
    connectionData?.id ?? '00000000-0000-0000-0000-000000000000';

  const [pagesResult, formsResult, logsResult] = await Promise.all([
    supabase
      .schema('core')
      .from('integration_accounts')
      .select(
        'id, external_account_id, display_name, email, metadata, status, created_at, updated_at',
      )
      .eq('workspace_id', workspaceId)
      .eq('connection_id', connectionId)
      .eq('is_deleted', false),

    supabase
      .schema('core')
      .from('meta_ads_forms')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false }),

    supabase
      .schema('core')
      .from('meta_ads_sync_logs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const connection = connectionData
    ? { ...connectionData, workspace_id: workspaceId, provider: 'meta_ads' }
    : null;

  // Fetch field mappings for all configured forms
  let mappings: unknown[] = [];
  const forms = formsResult.data ?? [];
  if (forms.length > 0) {
    const formIds = forms.map((f: { id: string }) => f.id);
    const { data: mappingData } = await supabase
      .schema('core')
      .from('meta_ads_field_mappings')
      .select('*')
      .in('form_id', formIds);
    mappings = mappingData ?? [];
  }

  const payload: MetaAdsSettingsData = {
    connection,
    pages: pagesResult.data ?? [],
    forms,
    mappings: mappings as any[],
    recentLogs: logsResult.data ?? [],
  };

  return NextResponse.json({ success: true, data: payload });
}

// ---------------------------------------------------------------------------
// POST /api/workspaces/[id]/meta-ads — action dispatcher
// ---------------------------------------------------------------------------
