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

export const GET = enhanceRouteHandler(getIndustries, { auth: true });
