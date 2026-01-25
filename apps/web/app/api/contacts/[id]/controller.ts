import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse,
} from '../../../../utils/response-handler';

/**
 * GET /api/contacts/[id]
 * Fetch single contact by ID
 */
export const getContactById = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const contactId = params?.id;

    if (!contactId) {
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

    // Fetch contact with relations
    const { data: contact, error } = await supabase
      .from('crm_contacts')
      .select(
        `
          *,
          status:entity_statuses(id, status_name, status_key, color, icon),
          owner:accounts!crm_contacts_owner_id_fkey(id, email, name),
          account:crm_accounts(id, account_name)
        `,
      )
      .eq('id', contactId)
      .single();

    if (error) {
      console.error('Get contact error:', error);
      throw error;
    }

    if (!contact) {
      return NextResponse.json(
        { message: 'Contact not found' },
        { status: 404 },
      );
    }

    return successDataResponse('Contact retrieved successfully', contact);
  },
);
