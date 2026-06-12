import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { getAccessibleInboxAccounts } from '../../lib/email/account-access';
import { catchAsync, successDataResponse } from '../../utils/response-handler';
import { assertCoreWorkspaceAccess } from '../_shared/workspace-access';

function normalizePositiveInt(
  value: string | null,
  fallback: number,
  max: number,
) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(Math.floor(parsed), max);
}

function normalizeOffset(value: string | null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.floor(parsed);
}

function sanitizePostgrestSearch(value: string) {
  return value.trim().replace(/[,%]/g, ' ');
}

export const getCoreEmailActivityController = catchAsync(
  async ({ request }) => {
    const url = new URL(request.url);
    const workspaceId =
      url.searchParams.get('workspaceId') ??
      url.searchParams.get('workspace_id');
    const entityId =
      url.searchParams.get('entityId') ?? url.searchParams.get('entity_id');
    const entityType =
      url.searchParams.get('entityType') ?? url.searchParams.get('entity_type');
    const accountEmail = url.searchParams.get('accountEmail')?.toLowerCase();
    const direction = url.searchParams.get('direction');
    const search = sanitizePostgrestSearch(
      url.searchParams.get('search') ?? '',
    );
    const limit = normalizePositiveInt(url.searchParams.get('limit'), 20, 100);
    const offset = normalizeOffset(url.searchParams.get('offset'));

    if (!workspaceId && (!entityId || !entityType)) {
      return NextResponse.json(
        {
          success: false,
          message: 'workspaceId or entityId/entityType is required',
        },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();
    const resolvedWorkspaceId = workspaceId;

    if (resolvedWorkspaceId) {
      const { user, error } =
        await assertCoreWorkspaceAccess(resolvedWorkspaceId);
      if (error || !user) return error!;
    }

    if (entityId && entityType) {
      if (!resolvedWorkspaceId) {
        return NextResponse.json(
          {
            success: false,
            message: 'workspaceId is required for entity email activity',
          },
          { status: 400 },
        );
      }

      const { data: relations, error: relationError } = await (supabase as any)
        .schema('core')
        .from('email_relations')
        .select('email_id')
        .eq('workspace_id', resolvedWorkspaceId)
        .eq('entity_id', entityId)
        .eq('entity_type', entityType);

      if (relationError) throw relationError;

      const emailIds = Array.from(
        new Set((relations ?? []).map((relation: any) => relation.email_id)),
      );

      if (emailIds.length === 0) {
        return successDataResponse('Email activity retrieved successfully', {
          data: [],
          count: 0,
          limit,
          offset,
        });
      }

      const { data, error, count } = await (supabase as any)
        .schema('core')
        .from('emails')
        .select('*,email_relations(*)', { count: 'exact' })
        .eq('workspace_id', resolvedWorkspaceId)
        .eq('is_deleted', false)
        .in('id', emailIds)
        .order('received_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return successDataResponse('Email activity retrieved successfully', {
        data: data ?? [],
        count: count ?? 0,
        limit,
        offset,
      });
    }

    const accessibleInboxAccounts = await getAccessibleInboxAccounts(
      supabase,
      resolvedWorkspaceId!,
    );

    if (accessibleInboxAccounts.length === 0) {
      return successDataResponse('Email activity retrieved successfully', {
        data: [],
        count: 0,
        limit,
        offset,
      });
    }

    if (
      accountEmail &&
      !accessibleInboxAccounts.some(
        (account: { id: number; email: string }) =>
          account.email === accountEmail,
      )
    ) {
      return NextResponse.json(
        { success: false, message: 'You do not have access to this inbox' },
        { status: 403 },
      );
    }

    const inboxAccountIds = accessibleInboxAccounts
      .filter(
        (account: { id: number; email: string }) =>
          !accountEmail || account.email === accountEmail,
      )
      .map((account: { id: number; email: string }) => account.id);

    if (inboxAccountIds.length === 0) {
      return successDataResponse('Email activity retrieved successfully', {
        data: [],
        count: 0,
        limit,
        offset,
      });
    }

    let query = (supabase as any)
      .schema('core')
      .from('emails')
      .select('*,email_relations(*)', { count: 'exact' })
      .eq('workspace_id', resolvedWorkspaceId!)
      .eq('is_deleted', false)
      .in('email_account_id', inboxAccountIds);

    if (direction === 'inbound' || direction === 'outbound') {
      query = query.eq('direction', direction);
    }

    if (search) {
      query = query.or(
        [
          `subject.ilike.%${search}%`,
          `from_email.ilike.%${search}%`,
          `to_email.ilike.%${search}%`,
          `snippet.ilike.%${search}%`,
          `text_body.ilike.%${search}%`,
        ].join(','),
      );
    }

    const { data, error, count } = await query
      .order('received_at', { ascending: false, nullsFirst: false })
      .order('sent_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return successDataResponse('Email activity retrieved successfully', {
      data: data ?? [],
      count: count ?? 0,
      limit,
      offset,
    });
  },
);

export const saveCoreEmailActivityController = catchAsync(
  async ({ request }) => {
    const body = await request.json().catch(() => null);
    const workspaceId = body?.workspace_id ?? body?.workspaceId;

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: 'workspace_id is required' },
        { status: 400 },
      );
    }

    const { supabase, user, error } =
      await assertCoreWorkspaceAccess(workspaceId);
    if (error || !user) return error!;

    const payload = {
      workspace_id: workspaceId,
      email_account_id: body.email_account_id ?? body.emailAccountId ?? null,
      direction: body.direction ?? 'outbound',
      from_email: body.from_email ?? body.fromEmail ?? null,
      to_email: body.to_email ?? body.toEmail ?? body.to_emails ?? null,
      to_emails: Array.isArray(body.to_emails)
        ? body.to_emails
        : body.to_emails
          ? [body.to_emails]
          : [],
      cc: body.cc ?? body.cc_emails ?? null,
      bcc: body.bcc ?? body.bcc_emails ?? null,
      subject: body.subject ?? '',
      body: body.body ?? body.text_body ?? null,
      html_body: body.html_body ?? body.body ?? null,
      text_body: body.text_body ?? null,
      status: body.status ?? 'draft',
      scheduled_at: body.scheduled_at ?? body.scheduledAt ?? null,
      from_name: body.from_name ?? body.fromName ?? null,
      thread_id: body.thread_id ?? body.threadId ?? null,
      thread_key: body.thread_key ?? body.threadKey ?? null,
      created_by: user.id,
      updated_by: user.id,
    };

    const { data: email, error: upsertError } = await (supabase as any)
      .schema('core')
      .from('emails')
      .upsert(body.id ? { id: body.id, ...payload } : payload)
      .select('*')
      .single();

    if (upsertError) throw upsertError;

    const entityType = body.entity_type ?? body.entityType;
    const entityId = body.entity_id ?? body.entityId;
    if (entityType && entityId) {
      await (supabase as any)
        .schema('core')
        .from('email_relations')
        .upsert({
          workspace_id: workspaceId,
          email_id: email.id,
          entity_type: entityType,
          entity_id: entityId,
          relation_type: body.relation_type ?? 'related',
        });
    }

    return successDataResponse('Email activity saved successfully', email);
  },
);

export const deleteCoreEmailActivityController = catchAsync(
  async ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const workspaceId =
      url.searchParams.get('workspaceId') ??
      url.searchParams.get('workspace_id');

    if (!id || !workspaceId) {
      return NextResponse.json(
        { success: false, message: 'id and workspaceId are required' },
        { status: 400 },
      );
    }

    const { supabase, user, error } =
      await assertCoreWorkspaceAccess(workspaceId);
    if (error || !user) return error!;

    const { error: deleteError } = await (supabase as any)
      .schema('core')
      .from('emails')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (deleteError) throw deleteError;

    return successDataResponse('Email activity deleted successfully', { id });
  },
);
