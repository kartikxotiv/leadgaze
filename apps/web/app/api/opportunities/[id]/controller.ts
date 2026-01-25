import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { catchAsync, successDataResponse } from '~/utils/response-handler';

/**
 * GET /api/opportunities/[id]
 * Fetch a single opportunity by ID
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
    const id = params?.id;

    if (!id) {
      return NextResponse.json(
        { message: 'Opportunity ID is required' },
        { status: 400 },
      );
    }

    const { data: opportunity, error } = await supabase
      .from('crm_opportunities')
      .select(
        `
          *,
          stage:entity_statuses(id, status_name, status_key, color, icon),
          account:crm_accounts(id, account_name),
          owner:accounts!crm_opportunities_owner_id_fkey(id, email, name)
        `,
      )
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error) {
      console.error('Get opportunity error:', error);
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

/**
 * PATCH /api/opportunities/[id]
 * Update an opportunity
 */
export const updateOpportunity = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const id = params?.id;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { message: 'Opportunity ID is required' },
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

    const { data: opportunity, error } = await supabase
      .from('crm_opportunities')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update opportunity error:', error);
      throw error;
    }

    return successDataResponse('Opportunity updated successfully', opportunity);
  },
);
