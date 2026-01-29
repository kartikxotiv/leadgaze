import { NextRequest, NextResponse } from 'next/server';

import { enhanceRouteHandler } from '@kit/next/routes';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';

export const getIndustries = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    const supabase = getSupabaseServerClient();
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
        { status: 400 },
      );
    }

    const { data: industries, error } = await supabase
      .from('crm_industries')
      .select('id, industry_name')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .order('industry_name', { ascending: true });

    if (error) {
      console.error('Get industries error:', error);
      throw error;
    }

    return successDataResponse(
      'Industries retrieved successfully',
      industries || [],
    );
  },
);

/**
 * POST /api/industries
 * Create a new industry
 */
export const createIndustry = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    const supabase = getSupabaseServerClient();
    const body = await request.json();
    const { workspace_id, industry_name } = body;

    if (!workspace_id || !industry_name) {
      return NextResponse.json(
        { message: 'workspace_id and industry_name are required' },
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

    // Check if industry already exists
    const { data: existing } = await supabase
      .from('crm_industries')
      .select('id')
      .eq('workspace_id', workspace_id)
      .eq('industry_name', industry_name.trim())
      .single();

    if (existing) {
      return NextResponse.json(
        { message: 'Industry already exists' },
        { status: 409 },
      );
    }

    const { data: industry, error } = await supabase
      .from('crm_industries')
      .insert({
        workspace_id,
        industry_name: industry_name.trim(),
        is_active: true,
        is_system: false,
        created_by: user.id,
      })
      .select('id, industry_name')
      .single();

    if (error) {
      console.error('Create industry error:', error);
      throw error;
    }

    return successDataResponse('Industry created successfully', industry);
  },
);

export const GET = enhanceRouteHandler(getIndustries, { auth: true });
export const POST = enhanceRouteHandler(createIndustry, { auth: true });