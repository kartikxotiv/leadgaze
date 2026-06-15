/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  getSendableEmailAccountById,
  hasWorkspaceEmailFeatureAccess,
} from '~/lib/email/email-account-access';
import { sendMail } from '~/lib/email/mailer';
import { catchAsync, successDataResponse } from '~/utils/response-handler';

export const sendEmail = catchAsync(async ({ request }) => {
  const payload: any = await request.json();
  const supabase = getSupabaseServerClient();

  const {
    entityId,
    entityType,
    workspaceId: payloadWorkspaceId,
    toEmails: payloadToEmails,
    cc,
    bcc,
    subject,
    body,
    scheduledAt,
    emailId, // Existing record ID to update
    emailAccountId,
  } = payload;

  let workspaceId = payloadWorkspaceId;
  let toEmails = payloadToEmails;

  if (entityId && entityType === 'lead' && !toEmails) {
    const { data: lead, error: leadError } = await (
      supabase.from('crm_leads').select() as any
    )
      .eq('id', entityId)
      .eq('is_deleted', false)
      .single();

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (leadError) {
      throw leadError;
    }

    if (!lead.email) {
      return NextResponse.json(
        { error: 'Lead email not found' },
        { status: 404 },
      );
    }

    workspaceId = lead.workspace_id;
    toEmails = lead.email;
  }

  if (!workspaceId) {
    return NextResponse.json(
      { error: 'Missing workspace_id' },
      { status: 400 },
    );
  }

  if (!toEmails) {
    return NextResponse.json(
      { error: 'Missing recipient email' },
      { status: 400 },
    );
  }

  const canSendEmails = await hasWorkspaceEmailFeatureAccess(
    supabase,
    workspaceId,
    'manage_email',
  );

  if (!canSendEmails) {
    return NextResponse.json(
      { error: 'You do not have permission to send emails' },
      { status: 403 },
    );
  }

  const account = await getSendableEmailAccountById(
    supabase,
    workspaceId,
    emailAccountId ? Number(emailAccountId) : undefined,
  );

  if (!account) {
    return NextResponse.json(
      { error: 'No sendable email account available' },
      { status: 403 },
    );
  }

  /* ---------------- SEND OR SCHEDULE EMAIL ---------------- */
  let info: any = null;
  const isScheduled = scheduledAt && new Date(scheduledAt) > new Date();

  if (!isScheduled) {
    info = await sendMail({
      account,
      from: account?.email,
      to: toEmails,
      cc,
      bcc,
      subject,
      html: body,
    });
  }

  // PERSIST IN DATABASE
  const emailData = {
    workspace_id: workspaceId,
    direction: 'outbound',
    from_email: account.email,
    to_emails: toEmails,
    cc_emails: Array.isArray(cc) ? cc.join(', ') : cc,
    bcc_emails: Array.isArray(bcc) ? bcc.join(', ') : bcc,
    subject,
    html_body: body,
    status: isScheduled ? 'scheduled' : 'sent',
    scheduled_at: scheduledAt || null,
    sent_at: isScheduled ? null : new Date().toISOString(),
    entity_type: entityType || null,
    entity_id: entityId || null,
    gmail_message_id: info?.messageId || null,
  } as any;

  let emailRecord;
  let emailError;

  if (emailId) {
    const { data, error } = await supabase
      .from('emails')
      .update(emailData)
      .eq('id', emailId)
      .select()
      .single();
    emailRecord = data;
    emailError = error;
  } else {
    const { data, error } = await supabase
      .from('emails')
      .insert(emailData)
      .select()
      .single();
    emailRecord = data;
    emailError = error;
  }

  if (emailError) {
    console.error('Email persistence error:', emailError);
  }

  return successDataResponse({
    messageId: info?.messageId,
    email: emailRecord,
  });
});
