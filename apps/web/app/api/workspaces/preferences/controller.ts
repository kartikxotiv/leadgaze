import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

// =====================================================
// GET /api/workspaces/preferences?workspaceId=xxx
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

    const { data, error } = await supabase
      .schema('core')
      .from('workspace_preferences')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single();

    if (error) {
      // If no row exists yet, return defaults
      if (error.code === 'PGRST116') {
        return successDataResponse({
          timezone: 'UTC',
          date_format: 'MM-DD-YYYY',
          time_format: '12h',
          default_currency: 'USD',
          workspace_id: workspaceId,
        });
      }

      return NextResponse.json(
        { message: 'Failed to fetch preferences' },
        { status: 500 },
      );
    }

    return successDataResponse(data);
  },
);

// =====================================================
// PUT /api/workspaces/preferences
// =====================================================

export const updateWorkspacePreferences = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    const supabase = getSupabaseServerClient() as any;
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
    if (default_currency !== undefined) payload.default_currency = default_currency;

    // Upsert: insert if not exists, update if exists
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
