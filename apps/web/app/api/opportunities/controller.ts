import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';

/**
 * GET /api/opportunities
 * Fetch all opportunities for a workspace
 */
export const getOpportunities = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId');
    const accountId = url.searchParams.get('accountId');

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
        { status: 400 },
      );
    }

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions (Workspace Access)
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();

    if (workspaceError) {
      console.error('Workspace fetch error:', workspaceError);
      throw workspaceError;
    }

    // Build the query
    // Join with Stage (Status), Account, Owner.
    let query = supabase
      .from('crm_opportunities')
      .select(
        `
          *,
          stage:entity_statuses(id, status_name, status_key, color, icon),
          account:crm_accounts(id, account_name),
          owner:accounts!crm_opportunities_owner_id_fkey(id, email, name)
        `,
      )
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false);

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    const { data: opportunities, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) {
      console.error('Get opportunities error:', error);
      throw error;
    }

    return successDataResponse(
      'Opportunities retrieved successfully',
      opportunities || [],
    );
  },
);
