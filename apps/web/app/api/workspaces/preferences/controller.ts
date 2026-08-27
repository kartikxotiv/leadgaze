import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

// =====================================================
// GET /api/workspaces/preferences?workspaceId=xxx
// NOTE: Kept for backwards-compatibility. New code should
// use GET /api/workspaces/settings which returns all
// workspace settings in one consolidated RPC call.
// =====================================================

export const getWorkspacePreferences = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    const supabase = getSupabaseServerClient() as any;
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
        { status: 400 },
      );
    }

    // Fetch workspace preferences
    const { data: prefData, error: prefError } = await supabase
      .schema('core')
      .from('workspace_preferences')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single();

    if (prefError) {
      // If no row exists yet, return defaults
      if (prefError.code === 'PGRST116') {
        // Also fetch enabled currencies
        const { data: currenciesData } = await supabase
          .schema('core')
          .from('workspace_currencies')
          .select('currency_code')
          .eq('workspace_id', workspaceId)
          .eq('is_active', true)
          .order('is_default', { ascending: false })
          .order('currency_code', { ascending: true });

        const enabledCurrencies = currenciesData?.map((c) => c.currency_code) || ['USD'];

        return successDataResponse({
          timezone: 'UTC',
          date_format: 'MM-DD-YYYY',
          time_format: '12h',
          default_currency: 'USD',
          enabledCurrencies,
          workspace_id: workspaceId,
        });
      }

      return NextResponse.json(
        { message: 'Failed to fetch preferences' },
        { status: 500 },
      );
    }

    // Fetch enabled currencies for this workspace
    const { data: currenciesData, error: currenciesError } = await supabase
      .schema('core')
      .from('workspace_currencies')
      .select('currency_code')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('currency_code', { ascending: true });

    if (currenciesError) {
      console.error('Failed to fetch currencies:', currenciesError);
    }

    const enabledCurrencies = currenciesData?.map((c) => c.currency_code) || ['USD'];

    return successDataResponse({
      ...prefData,
      enabledCurrencies,
    });
  },
);

// =====================================================
// PUT /api/workspaces/preferences
// =====================================================

export const updateWorkspacePreferences = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    const supabase = getSupabaseServerClient() as any;
    const adminClient = getSupabaseServerAdminClient() as any;
    const body = await request.json();

    const { workspace_id, timezone, date_format, time_format, default_currency } = body;

    if (!workspace_id) {
      return NextResponse.json(
        { message: 'workspace_id is required' },
        { status: 400 },
      );
    }

    // Validate date_format
    const validDateFormats = [
      'DD-MM-YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD',
      'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY/MM/DD',
    ];
    if (date_format && !validDateFormats.includes(date_format)) {
      return NextResponse.json(
        { message: `Invalid date_format. Must be one of: ${validDateFormats.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate time_format
    if (time_format && !['12h', '24h'].includes(time_format)) {
      return NextResponse.json(
        { message: 'Invalid time_format. Must be "12h" or "24h"' },
        { status: 400 },
      );
    }

    // Build the upsert payload (only include provided fields)
    const payload: Record<string, unknown> = { workspace_id };
    if (timezone !== undefined) payload.timezone = timezone;
    if (date_format !== undefined) payload.date_format = date_format;
    if (time_format !== undefined) payload.time_format = time_format;

    if (default_currency !== undefined) {
      // Use atomic RPC: swaps is_default flag + syncs workspace_preferences in one transaction.
      // Replaces 3 sequential DB writes (unset defaults, set new default, sync prefs).
      const { data: rpcData, error: rpcError } = await adminClient.rpc(
        'update_workspace_default_currency',
        {
          p_workspace_id: workspace_id,
          p_currency_code: default_currency,
        },
      );

      if (rpcError) {
        console.error('Currency default update error:', rpcError);
        return NextResponse.json(
          { message: 'Failed to update default currency' },
          { status: 500 },
        );
      }

      // If there are also non-currency preference fields in this request, upsert them too
      if (Object.keys(payload).length > 1) {
        await supabase
          .schema('core')
          .from('workspace_preferences')
          .upsert(payload, { onConflict: 'workspace_id' });
      }

      return successDataResponse(rpcData, null);
    }

    // Non-currency update: upsert directly
    const { data, error } = await supabase
      .schema('core')
      .from('workspace_preferences')
      .upsert(payload, { onConflict: 'workspace_id' })
      .select()
      .single();

    if (error) {
      console.error('Preferences update error:', error);
      return NextResponse.json(
        { message: 'Failed to update preferences' },
        { status: 500 },
      );
    }

    return successDataResponse(data, null);
  },
);
