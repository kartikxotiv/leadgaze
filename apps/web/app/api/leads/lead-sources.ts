import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';

const getLeadSources = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
        { status: 400 },
      );
    }

    const { data: sources, error } = await supabase
      .from('lead_sources')
      .select('id, source_name, source_key, color, icon')
      .eq('workspace_id', workspaceId)
      .order('source_name', { ascending: true });

    if (error) {
      console.error('Get sources error:', error);
      throw error;
    }

    return successDataResponse('Sources retrieved successfully', sources || []);
  },
);

/**
 * GET /api/leads/statuses
 * Fetch all lead statuses for a workspace
 * Supports ?includeInactive=true to return all statuses (for management dialog)
 */

const createLeadSource = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const body = await request.json();
    const { workspace_id, source_name } = body;

    if (!workspace_id || !source_name) {
      return NextResponse.json(
        { message: 'workspace_id and source_name are required' },
        { status: 400 },
      );
    }

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Generate source_key from source_name (lowercase, replace spaces with underscores)
    const source_key = source_name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    // Check if source already exists
    const { data: existing } = await supabase
      .from('lead_sources')
      .select('id')
      .eq('workspace_id', workspace_id)
      .eq('source_key', source_key)
      .single();

    if (existing) {
      return NextResponse.json(
        { message: 'Lead source already exists' },
        { status: 409 },
      );
    }

    // Get the highest sort_order for this workspace
    const { data: maxSort } = await supabase
      .from('lead_sources')
      .select('sort_order')
      .eq('workspace_id', workspace_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const sort_order = (maxSort?.sort_order ?? -1) + 1;

    const { data: source, error } = await supabase
      .from('lead_sources')
      .insert({
        workspace_id,
        source_name: source_name.trim(),
        source_key,
        is_active: true,
        is_system: false,
        sort_order,
        created_by: user.id,
      })
      .select('id, source_name, source_key, color, icon')
      .single();

    if (error) {
      console.error('Create lead source error:', error);
      throw error;
    }

    return successDataResponse('Lead source created successfully', source);
  },
);

/**
 * POST /api/leads/statuses
 * Create a new lead status
 */

export { getLeadSources, createLeadSource };
