import { NextResponse } from 'next/server';

import { createCoreControllers } from '../_shared/core-crud';
import {
  hasSalesManageEmailPermission,
  isSalesEmailEntityType,
} from '../_shared/permissions';
import { assertCoreWorkspaceAccess } from '../_shared/workspace-access';

const SALES_EMAIL_PERMISSION_MESSAGE =
  'You do not have permission to manage Sales email';

async function hasSalesEmailRelation(
  supabase: any,
  workspaceId: string,
  emailIds: string | string[],
) {
  const ids = Array.isArray(emailIds) ? emailIds : [emailIds];

  if (ids.length === 0) {
    return false;
  }

  const { data, error } = await (supabase as any)
    .schema('core')
    .from('email_relations')
    .select('entity_type')
    .eq('workspace_id', workspaceId)
    .in('email_id', ids);

  if (error) throw error;

  return (data ?? []).some((relation: any) =>
    isSalesEmailEntityType(relation.entity_type),
  );
}

async function rejectSalesEmailWithoutPermission({
  workspaceId,
  entityType,
  emailId,
  threadId,
}: {
  workspaceId?: string | null;
  entityType?: string | null;
  emailId?: string | null;
  threadId?: string | null;
}) {
  if (!workspaceId) return null;

  const { supabase, user, error } =
    await assertCoreWorkspaceAccess(workspaceId);
  if (error || !user) return error!;

  let threadEmailIds: string[] = [];

  if (threadId) {
    const { data, error: emailsError } = await (supabase as any)
      .schema('core')
      .from('emails')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('thread_id', threadId);

    if (emailsError) throw emailsError;

    threadEmailIds = (data ?? []).map((email: any) => email.id);
  }

  const needsSalesPermission =
    isSalesEmailEntityType(entityType) ||
    (!!emailId &&
      (await hasSalesEmailRelation(supabase, workspaceId, emailId))) ||
    (threadEmailIds.length > 0 &&
      (await hasSalesEmailRelation(supabase, workspaceId, threadEmailIds)));

  if (
    needsSalesPermission &&
    !(await hasSalesManageEmailPermission(supabase, workspaceId, user.id))
  ) {
    return NextResponse.json(
      {
        success: false,
        message: SALES_EMAIL_PERMISSION_MESSAGE,
      },
      { status: 403 },
    );
  }

  return null;
}

const emails = createCoreControllers({
  table: 'emails',
  relation: { table: 'email_relations', foreignKey: 'email_id' },
  label: 'Email',
  requiredCreateFields: [
    'workspace_id',
    'entity_type',
    'entity_id',
    'to_email',
    'subject',
    'body',
  ],
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

export const getEmailsController = async (ctx: any) => {
  const url = new URL(ctx.request.url);
  const denial = await rejectSalesEmailWithoutPermission({
    workspaceId: url.searchParams.get('workspaceId'),
    entityType:
      url.searchParams.get('entityType') ?? url.searchParams.get('entity_type'),
    emailId: url.searchParams.get('id'),
    threadId: url.searchParams.get('threadId'),
  });

  if (denial) return denial;

  return emails.get(ctx);
};
export const getEmailThreadController = getEmailsController;

export const sendEmailController = async (ctx: any) => {
  const body = await ctx.request
    .clone()
    .json()
    .catch(() => null);
  const denial = await rejectSalesEmailWithoutPermission({
    workspaceId: body?.workspace_id ?? body?.workspaceId,
    entityType: body?.entity_type ?? body?.entityType,
  });

  if (denial) return denial;

  return emails.create(ctx);
};

export const updateEmailController = async (ctx: any) => {
  const body = await ctx.request
    .clone()
    .json()
    .catch(() => null);
  const denial = await rejectSalesEmailWithoutPermission({
    workspaceId: body?.workspace_id ?? body?.workspaceId,
    entityType: body?.entity_type ?? body?.entityType,
    emailId: body?.id,
  });

  if (denial) return denial;

  return emails.update(ctx);
};

export const deleteEmailController = async (ctx: any) => {
  const url = new URL(ctx.request.url);
  const denial = await rejectSalesEmailWithoutPermission({
    workspaceId: url.searchParams.get('workspaceId'),
    emailId: url.searchParams.get('id'),
  });

  if (denial) return denial;

  return emails.remove(ctx);
};
