import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { getSendableEmailAccountById } from '../../lib/email/account-access';
import { sendMail } from '../../lib/email/mailer';
import { catchAsync, successDataResponse } from '../../utils/response-handler';
import { assertCoreWorkspaceAccess } from '../_shared/workspace-access';

function normalizeRecipients(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const sendCoreEmailController = catchAsync(async ({ request }) => {
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json(
      { success: false, message: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const workspaceId = body.workspaceId ?? body.workspace_id;
  const toEmails = normalizeRecipients(
    body.toEmails ?? body.to_emails ?? body.to_email,
  );
  const ccEmails = normalizeRecipients(body.cc ?? body.cc_emails);
  const bccEmails = normalizeRecipients(body.bcc ?? body.bcc_emails);
  const subject = body.subject;
  const htmlBody = body.body ?? body.html_body;
  const scheduledAt = body.scheduledAt ?? body.scheduled_at;
  const entityType = body.entityType ?? body.entity_type;
  const entityId = body.entityId ?? body.entity_id;
  const emailAccountId = body.emailAccountId ?? body.email_account_id;
  const templateId = body.templateId ?? body.template_id ?? null;

  if (!workspaceId || toEmails.length === 0 || !subject || !htmlBody) {
    return NextResponse.json(
      {
        success: false,
        message: 'workspaceId, recipient, subject, and body are required',
      },
      { status: 400 },
    );
  }

  const { supabase, user, error } =
    await assertCoreWorkspaceAccess(workspaceId);
  if (error || !user) return error!;

  const account = await getSendableEmailAccountById(
    supabase,
    workspaceId,
    emailAccountId ? Number(emailAccountId) : undefined,
  );

  if (!account) {
    return NextResponse.json(
      { success: false, message: 'No sendable email account available' },
      { status: 403 },
    );
  }

  const isScheduled = scheduledAt && new Date(scheduledAt) > new Date();
  let sendInfo: any = null;

  if (!isScheduled) {
    sendInfo = await sendMail({
      account,
      from: account.email,
      to: toEmails.join(', '),
      cc: ccEmails.length ? ccEmails.join(', ') : undefined,
      bcc: bccEmails.length ? bccEmails.join(', ') : undefined,
      subject,
      html: htmlBody,
      headers: body.inReplyTo
        ? {
            'In-Reply-To': body.inReplyTo,
            References: body.references ?? body.inReplyTo,
          }
        : undefined,
    });
  }

  const emailPayload = {
    workspace_id: workspaceId,
    email_account_id: account.id,
    template_id: templateId,
    direction: 'outbound',
    from_email: account.email,
    from_name: account.from_name,
    to_email: toEmails[0],
    to_emails: toEmails,
    cc: ccEmails.join(', ') || null,
    cc_emails: ccEmails,
    bcc: bccEmails.join(', ') || null,
    bcc_emails: bccEmails,
    subject,
    body: htmlBody,
    html_body: htmlBody,
    text_body: body.text_body ?? null,
    status: isScheduled ? 'scheduled' : 'sent',
    scheduled_at: isScheduled ? scheduledAt : null,
    sent_at: isScheduled ? null : new Date().toISOString(),
    provider_message_id: sendInfo?.messageId ?? null,
    gmail_message_id: sendInfo?.messageId ?? null,
    internet_message_id: sendInfo?.messageId ?? null,
    thread_id: body.threadId ?? body.thread_id ?? null,
    thread_key: body.threadKey ?? body.thread_key ?? body.inReplyTo ?? null,
    in_reply_to: body.inReplyTo ?? body.in_reply_to ?? null,
    email_references: body.references ?? body.email_references ?? null,
    created_by: user.id,
    updated_by: user.id,
  };

  const { data: email, error: emailError } = await (supabase as any)
    .schema('core')
    .from('emails')
    .insert(emailPayload)
    .select('*')
    .single();

  if (emailError) throw emailError;

  if (entityType && entityId) {
    await (supabase as any)
      .schema('core')
      .from('email_relations')
      .upsert({
        workspace_id: workspaceId,
        email_id: email.id,
        entity_type: entityType,
        entity_id: entityId,
        relation_type: body.relationType ?? body.relation_type ?? 'related',
      });
  }

  await (supabase as any)
    .schema('core')
    .from('email_sends')
    .insert({
      workspace_id: workspaceId,
      email_id: email.id,
      email_account_id: account.id,
      template_id: templateId,
      to_email: toEmails[0],
      from_email: account.email,
      subject,
      rendered_html: htmlBody,
      rendered_text: body.text_body ?? null,
      provider_message_id: sendInfo?.messageId ?? null,
      thread_key: emailPayload.thread_key,
      status: isScheduled ? 'queued' : 'sent',
      created_by: user.id,
    });

  return successDataResponse('Email sent successfully', {
    messageId: sendInfo?.messageId ?? null,
    email,
  });
});
