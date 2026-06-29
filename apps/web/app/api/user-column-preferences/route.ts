import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { Database } from '~/lib/database.types';
import { coreDb } from '~/lib/field-permission/core-client';
import {
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

/**
 * GET /api/user-column-preferences
 * Get column preferences for a user and entity
 */
const getColumnPreferences = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient<Database>();
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId');
    const entityType = url.searchParams.get('entityType');

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
        { status: 400 },
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { data: preferences, error } = await coreDb(supabase)
      .from('user_column_preferences')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .eq('entity_type', entityType)
      .maybeSingle();

    if (error) {
      console.error('Get column preferences error:', error);
      throw error;
    }

    return successDataResponse('Column preferences retrieved successfully', preferences);
  },
);

/**
 * POST /api/user-column-preferences
 * Create or update user column preferences
 */
const upsertColumnPreferences = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient<Database>();
    const body = await request.json();

    const { workspace_id, entity_type, preferences } = body;

    if (!workspace_id || !entity_type || !preferences) {
      return NextResponse.json(
        { message: 'workspace_id, entity_type, and preferences are required' },
        { status: 400 },
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a member of this workspace
    const { data: member, error: memberError } = await supabase
      .from('workspace_members')
      .select('role_id')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { message: 'User is not a member of this workspace' },
        { status: 403 },
      );
    }

    // Merge with existing preferences (preserving fields not in new preferences)
    const { data: existingPreferences, error: existingError } = await coreDb(supabase)
      .from('user_column_preferences')
      .select('preferences')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .eq('entity_type', entity_type)
      .maybeSingle();

    let mergedPreferences = preferences;

    if (existingPreferences) {
      // Merge existing with new preferences
      const existing = existingPreferences.preferences;
      mergedPreferences = {
        visibleColumns: preferences.visibleColumns || existing.visibleColumns || [],
        columnWidths: { ...existing.columnWidths, ...preferences.columnWidths },
        columnOrder: preferences.columnOrder || existing.columnOrder || [],
      };
    }

    const { data: updatedPreferences, error } = await coreDb(supabase)
      .from('user_column_preferences')
      .upsert({
        workspace_id,
        user_id: user.id,
        entity_type,
        preferences: mergedPreferences,
      })
      .select()
      .single();

    if (error) {
      console.error('Upsert column preferences error:', error);
      throw error;
    }

    return successDataResponse(
      'Column preferences updated successfully',
      updatedPreferences,
    );
  },
);

export { getColumnPreferences, upsertColumnPreferences };
