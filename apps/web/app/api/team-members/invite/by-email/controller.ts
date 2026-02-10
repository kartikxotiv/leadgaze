import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { catchAsync, successDataResponse } from '~/utils/response-handler';

const getInvitationsByEmail = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const url = new URL(request.url);
    const email = url.searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { message: 'email is required' },
        { status: 400 },
      );
    }

    // Find all pending invitations for this email
    const { data: invitations, error } = await supabase
      .from('workspace_invitations')
      .select('id, token, email, status, token_expires_at')
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get invitations by email error:', error);
      throw error;
    }

    // Filter out expired invitations
    const validInvitations = invitations?.filter((invitation) => {
      if (!invitation.token_expires_at) {
        return true; // No expiration date means it doesn't expire
      }
      return new Date(invitation.token_expires_at) >= new Date();
    }) || [];

    // Return the most recent valid invitation (if any)
    const latestInvitation = validInvitations.length > 0 ? validInvitations[0] : null;

    return successDataResponse(
      latestInvitation
        ? 'Pending invitation found'
        : 'No pending invitations found',
      latestInvitation,
    );
  },
);

export { getInvitationsByEmail };
