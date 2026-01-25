import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse,
} from '../../../../utils/response-handler';

/**
 * GET /api/opportunities/[id]
 * Fetch single opportunity by ID
 */
export const getOpportunityById = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const opportunityId = params?.id;

    if (!opportunityId) {
      return NextResponse.json({ message: 'ID is required' }, { status: 400 });
    }

    // Auth check
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Fetch opportunity with relations
    const { data: opportunity, error } = await supabase
      .from('crm_opportunities')
      .select(
        `
          *,
          stage:entity_statuses(id, status_name, status_key, color, icon),
          owner:accounts!crm_opportunities_owner_id_fkey(id, email, name),
          account:crm_accounts(id, account_name)
        `,
      )
      .eq('id', opportunityId)
      .single();

    if (error) {
      console.error('Get opportunity error:', error);
      throw error;
    }

    if (!opportunity) {
      return NextResponse.json(
        { message: 'Opportunity not found' },
        { status: 404 },
      );
    }

    return successDataResponse(
      'Opportunity retrieved successfully',
      opportunity,
    );
  },
);
