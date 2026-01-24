import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { catchAsync, successDataResponse } from '~/utils/response-handler';

const validateInvite = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { message: 'token is required' },
        { status: 400 },
      );
    }

    // Find the invitation by token
    const { data: invitation, error } = await supabase
      .from('workspace_invitations')
      .select(
        '*, workspace:workspaces(id, name, slug), role:workspace_roles(id, role_name)',
      )
      .eq('token', token)
      .single();

    if (error || !invitation) {
      return NextResponse.json(
        { message: 'Invalid or expired invitation token' },
        { status: 404 },
      );
    }

    // Check if invitation is still valid
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { message: `Invitation has already been ${invitation.status}` },
        { status: 400 },
      );
    }

    // Check if token has expired
    if (
      invitation.token_expires_at &&
      new Date(invitation.token_expires_at) < new Date()
    ) {
      return NextResponse.json(
        { message: 'Invitation token has expired' },
        { status: 400 },
      );
    }

    return successDataResponse('Invitation is valid', invitation);
  },
);

export { validateInvite };
