import { NextRequest } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse,
  errorResponse,
} from '~/utils/response-handler';

/**
 * GET /api/workspace/{id}/preferences
 * 
 * Get workspace preferences by workspace ID.
 * Replaces direct Supabase call from frontend.
 */
export const getWorkspacePreferencesById = catchAsync(
  async ({ 
    request,
    params 
  }: { 
    request: NextRequest;
    params: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient() as any;
    const workspaceId = params.id;

    if (!workspaceId) {
      return errorResponse('Workspace ID is required', 400);
    }

    try {
      // Fetch workspace preferences
      const { data: prefData, error: prefError } = await supabase
        .schema('core')
        .from('workspace_preferences')
        .select('*')
        .eq('workspace_id', workspaceId)
        .single();

      // If no preferences exist, return defaults
      if (prefError?.code === 'PGRST116') {
        const defaultPreferences = {
          id: null,
          workspace_id: workspaceId,
          timezone: 'UTC',
          date_format: 'MM-DD-YYYY',
          time_format: '12h',
          week_start_day: 1, // Monday
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        console.log(`[Workspace Preferences] No preferences found for workspace ${workspaceId}, returning defaults`);
        return successDataResponse('Workspace preferences retrieved (defaults)', defaultPreferences);
      }

      if (prefError) {
        console.error('[Workspace Preferences] Error fetching preferences:', prefError);
        return errorResponse('Failed to fetch workspace preferences', 500);
      }

      console.log(`[Workspace Preferences] Retrieved preferences for workspace ${workspaceId}`);
      return successDataResponse('Workspace preferences retrieved successfully', prefData);

    } catch (error) {
      console.error('[Workspace Preferences] Unexpected error:', error);
      return errorResponse(
        error instanceof Error 
          ? `Failed to fetch workspace preferences: ${error.message}`
          : 'Failed to fetch workspace preferences',
        500
      );
    }
  }
);

/**
 * PUT /api/workspace/{id}/preferences
 * 
 * Update workspace preferences by workspace ID.
 */
export const updateWorkspacePreferencesById = catchAsync(
  async ({ 
    request,
    params 
  }: { 
    request: NextRequest;
    params: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient() as any;
    const workspaceId = params.id;

    if (!workspaceId) {
      return errorResponse('Workspace ID is required', 400);
    }

    try {
      const body = await request.json();
      const { timezone, date_format, time_format, week_start_day, default_currency } = body;

      // Validate date_format
      const validDateFormats = [
        'DD-MM-YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD',
        'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY/MM/DD',
      ];
      if (date_format && !validDateFormats.includes(date_format)) {
        return errorResponse(
          `Invalid date_format. Must be one of: ${validDateFormats.join(', ')}`, 
          400
        );
      }

      // Validate time_format
      if (time_format && !['12h', '24h'].includes(time_format)) {
        return errorResponse('Invalid time_format. Must be "12h" or "24h"', 400);
      }

      // Validate week_start_day
      if (week_start_day !== undefined && (week_start_day < 0 || week_start_day > 6)) {
        return errorResponse('Invalid week_start_day. Must be 0-6 (Sunday-Saturday)', 400);
      }

      // Build the upsert payload (only include provided fields)
      const payload: Record<string, unknown> = { 
        workspace_id: workspaceId,
        updated_at: new Date().toISOString(),
      };
      
      if (timezone !== undefined) payload.timezone = timezone;
      if (date_format !== undefined) payload.date_format = date_format;
      if (time_format !== undefined) payload.time_format = time_format;
      if (week_start_day !== undefined) payload.week_start_day = week_start_day;
      if (default_currency !== undefined) payload.default_currency = default_currency;

      // Upsert: insert if not exists, update if exists
      const { data, error } = await supabase
        .schema('core')
        .from('workspace_preferences')
        .upsert(payload, { onConflict: 'workspace_id' })
        .select()
        .single();

      if (error) {
        console.error('[Workspace Preferences] Update error:', error);
        return errorResponse('Failed to update workspace preferences', 500);
      }

      // If default_currency was updated, sync with workspace_currencies
      if (default_currency !== undefined) {
        try {
          // Unset other defaults in workspace_currencies
          await supabase
            .schema('core')
            .from('workspace_currencies')
            .update({ is_default: false })
            .eq('workspace_id', workspaceId);

          // Set the new default
          await supabase
            .schema('core')
            .from('workspace_currencies')
            .update({ is_default: true })
            .eq('workspace_id', workspaceId)
            .eq('currency_code', default_currency.toUpperCase());

          console.log(`[Workspace Preferences] Updated default currency to ${default_currency} for workspace ${workspaceId}`);
        } catch (currencyError) {
          console.error('[Workspace Preferences] Failed to sync currency default:', currencyError);
          // Don't fail the request, just log the error
        }
      }

      console.log(`[Workspace Preferences] Updated preferences for workspace ${workspaceId}`);
      return successDataResponse('Workspace preferences updated successfully', data);

    } catch (error) {
      console.error('[Workspace Preferences] Unexpected error:', error);
      return errorResponse(
        error instanceof Error 
          ? `Failed to update workspace preferences: ${error.message}`
          : 'Failed to update workspace preferences',
        500
      );
    }
  }
);