import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse,
} from '../../../../utils/response-handler';

/**
 * GET /api/accounts/[id]
 * Fetch single account by ID
 */
export const getAccountById = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const accountId = params?.id;

    if (!accountId) {
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

    // Fetch account with relations
    const { data: account, error } = await supabase
      .from('crm_accounts')
      .select(
        `
          *,
          status:entity_statuses(id, status_name, status_key, color, icon),
          owner:accounts!crm_accounts_owner_id_fkey(id, email, name),
          industry:crm_industries(id, industry_name),
          created_by_account:accounts!crm_accounts_created_by_fkey(id, email, name)
        `,
      )
      .eq('id', accountId)
      .single();

    if (error) {
      console.error('Get account error:', error);
      throw error;
    }

    if (!account) {
      return NextResponse.json(
        { message: 'Account not found' },
        { status: 404 },
      );
    }

    return successDataResponse('Account retrieved successfully', account);
  },
);
