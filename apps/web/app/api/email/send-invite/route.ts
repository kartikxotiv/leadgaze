import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { successDataResponse } from '../../../utils/response-handler';

/**
 * Email service for sending workspace invitations
 * Currently logs to console, should be replaced with actual email service
 * (Resend, SendGrid, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const { email, workspaceName, inviteUrl, senderName, roleName } =
      await request.json();

    if (!email || !workspaceName || !inviteUrl) {
      return NextResponse.json(
        { message: 'email, workspaceName, and inviteUrl are required' },
        { status: 400 },
      );
    }

    // TODO: Implement actual email sending using service like Resend, SendGrid, etc.
    // Example with Resend:
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: 'invites@yourdomain.com',
    //   to: email,
    //   subject: `You've been invited to join ${workspaceName}`,
    //   html: `
    //     <h1>Join ${workspaceName}</h1>
    //     <p>${senderName} invited you to join the workspace: ${workspaceName}</p>
    //     <p>Your role: ${roleName}</p>
    //     <a href="${inviteUrl}">Accept Invitation</a>
    //   `,
    // });

    // For now, log to console
    console.log('📧 Invite Email:', {
      to: email,
      subject: `You've been invited to join ${workspaceName}`,
      inviteUrl,
      workspace: workspaceName,
      role: roleName,
      from: senderName,
    });

    return successDataResponse('Invitation email queued for sending', {
      email,
      status: 'queued',
    });
  } catch (error: any) {
    console.error('Send invite email error:', error);
    return NextResponse.json(
      { message: error?.message || 'Failed to send invitation email' },
      { status: 500 },
    );
  }
}
