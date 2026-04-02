/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { sendMail } from '~/lib/email/mailer';
import { catchAsync, successDataResponse } from '~/utils/response-handler';

export const sendEmail = catchAsync(async ({ request }) => {
  const payload: any = await request.json();
  const supabase = getSupabaseServerClient();

  const {
    leadId,
    cc,
    bcc,
    subject,
    body,
    scheduledAt,
    emailId, // Existing record ID to update
  } = payload;

  if (!leadId) {
    return NextResponse.json({ error: 'Missing lead_id' }, { status: 400 });
  }

  // FETCH LEAD
  const { data: lead, error: leadError } = await (
    supabase.from('crm_leads').select() as any
  )
    .eq('id', leadId)
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

  const { data: account, error: accountError } = await supabase
    .from('email_accounts')
    .select('*')
    .eq('workspace_id', lead.workspace_id)
    .single();

  if (accountError) {
    throw accountError;
  }

  if (!account) {
    return NextResponse.json(
      { error: 'Email account not found' },
      { status: 404 },
    );
  }

  /* ---------------- SEND OR SCHEDULE EMAIL ---------------- */
  let info: any = null;
  const isScheduled = scheduledAt && new Date(scheduledAt) > new Date();

  if (!isScheduled) {
    info = await sendMail({
      account,
      from: account?.email,
      to: lead.email,
      cc,
      bcc,
      subject,
      html: body,
    });
  }

  // PERSIST IN DATABASE
  const emailData = {
    workspace_id: lead.workspace_id,
    direction: 'outbound',
    from_email: account.email,
    to_emails: lead.email,
    cc_emails: Array.isArray(cc) ? cc.join(', ') : cc,
    bcc_emails: Array.isArray(bcc) ? bcc.join(', ') : bcc,
    subject,
    html_body: body,
    status: isScheduled ? 'scheduled' : 'sent',
    scheduled_at: scheduledAt || null,
    sent_at: isScheduled ? null : new Date().toISOString(),
    entity_type: 'lead',
    entity_id: leadId,
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
