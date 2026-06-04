import { createCoreControllers } from '../_shared/core-crud';

const emails = createCoreControllers({
  table: 'emails',
  relation: { table: 'email_relations', foreignKey: 'email_id' },
  label: 'Email',
  requiredCreateFields: ['workspace_id', 'entity_type', 'entity_id', 'to_email', 'subject', 'body'],
  defaultOrder: { column: 'sent_at', ascending: false },
  createPayload: (body, userId) => ({
    workspace_id: body.workspace_id ?? body.workspaceId,
    thread_id: body.thread_id ?? body.threadId ?? null,
    direction: body.direction ?? 'outbound',
    from_email: body.from_email ?? body.fromEmail ?? null,
    to_email: body.to_email ?? body.toEmail,
    cc: body.cc ?? null,
    bcc: body.bcc ?? null,
    subject: body.subject,
    body: body.body,
    status: body.status ?? 'sent',
    sent_at: body.sent_at ?? body.sentAt ?? new Date().toISOString(),
    created_by: userId,
    updated_by: userId,
  }),
  updatePayload: (body, userId) => ({
    thread_id: body.thread_id ?? body.threadId,
    direction: body.direction,
    from_email: body.from_email ?? body.fromEmail,
    to_email: body.to_email ?? body.toEmail,
    cc: body.cc,
    bcc: body.bcc,
    subject: body.subject,
    body: body.body,
    status: body.status,
    sent_at: body.sent_at ?? body.sentAt,
    updated_by: userId,
  }),
});

export const getEmailsController = emails.get;
export const getEmailThreadController = emails.get;
export const sendEmailController = emails.create;
export const updateEmailController = emails.update;
export const deleteEmailController = emails.remove;
