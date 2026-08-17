import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { getAccessibleInboxAccounts } from '../../lib/email/account-access';
import { catchAsync, successDataResponse } from '../../utils/response-handler';
import {
  hasSalesManageEmailPermission,
  isSalesEmailEntityType,
} from '../_shared/permissions';
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
    let currentUserId: string | null = null;

    if (resolvedWorkspaceId) {
      const { user, error } =
        await assertCoreWorkspaceAccess(resolvedWorkspaceId);
      if (error || !user) return error!;
      currentUserId = user.id;
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

      if (
        isSalesEmailEntityType(entityType) &&
        (!currentUserId ||
          !(await hasSalesManageEmailPermission(
            supabase,
            resolvedWorkspaceId,
            currentUserId,
          )))
      ) {
        return NextResponse.json(
          {
            success: false,
            message: 'You do not have permission to manage Sales email',
          },
          { status: 403 },
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

      const directEmailIds = Array.from(
        new Set((relations ?? []).map((relation: any) => relation.email_id)),
      );

      // Find entity's direct emails to extract thread identifiers
      let threadKeys: string[] = [];
      let threadIds: string[] = [];
      let messageIds: string[] = [];

      if (directEmailIds.length > 0) {
        const { data: directEmails } = await (supabase as any)
          .schema('core')
          .from('emails')
          .select('id,thread_key,thread_id,internet_message_id,provider_message_id,in_reply_to')
          .eq('workspace_id', resolvedWorkspaceId)
          .eq('is_deleted', false)
          .in('id', directEmailIds);

        (directEmails ?? []).forEach((item: any) => {
          if (item.thread_key) threadKeys.push(item.thread_key);
          if (item.thread_id) threadIds.push(item.thread_id);
          if (item.internet_message_id) messageIds.push(item.internet_message_id);
          if (item.provider_message_id) messageIds.push(item.provider_message_id);
          if (item.in_reply_to) messageIds.push(item.in_reply_to);
        });

        threadKeys = Array.from(new Set(threadKeys.filter(Boolean)));
        threadIds = Array.from(new Set(threadIds.filter(Boolean)));
        messageIds = Array.from(new Set(messageIds.filter(Boolean)));
      }

      // Also get entity's email address if lead or contact
      let entityEmailAddress: string | null = null;
      if (entityType === 'lead') {
        const { data: lead } = await (supabase as any)
          .from('crm_leads')
          .select('email')
          .eq('id', entityId)
          .maybeSingle();
        if (lead?.email) entityEmailAddress = lead.email.trim().toLowerCase();
      } else if (entityType === 'contact') {
        const { data: contact } = await (supabase as any)
          .from('crm_contacts')
          .select('email')
          .eq('id', entityId)
          .maybeSingle();
        if (contact?.email) entityEmailAddress = contact.email.trim().toLowerCase();
      }

      // Build combined filters for emails belonging directly to this lead/contact or linked outbound threads
      const matchFilters: string[] = [];
      if (directEmailIds.length > 0) {
        matchFilters.push(`id.in.(${directEmailIds.join(',')})`);
      }
      if (entityEmailAddress) {
        matchFilters.push(`from_email.ilike.${entityEmailAddress}`);
        matchFilters.push(`to_email.ilike.${entityEmailAddress}`);
      }

      if (matchFilters.length === 0) {
        return successDataResponse('Email activity retrieved successfully', {
          data: [],
          count: 0,
          limit,
          offset,
        });
      }

      // 1. Enforce connected email account privacy (private vs public/workspace):
      const accessibleAccounts = await getAccessibleInboxAccounts(
        supabase,
        resolvedWorkspaceId!,
      );

      if (accessibleAccounts.length === 0) {
        return successDataResponse('Email activity retrieved successfully', {
          data: [],
          count: 0,
          limit,
          offset,
        });
      }

      const accessibleAccountIds = new Set(accessibleAccounts.map((a: any) => a.id));
      const accessibleAccountEmails = new Set(
        accessibleAccounts.map((a: any) => a.email.toLowerCase()),
      );

      // 2. Fetch candidate emails matching the entity's relations or email address
      const { data: candidateEmails, error } = await (supabase as any)
        .schema('core')
        .from('emails')
        .select('*,email_relations(*)')
        .eq('workspace_id', resolvedWorkspaceId)
        .eq('is_deleted', false)
        .or(matchFilters.join(','))
        .order('received_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 3. Filter candidates strictly:
      // (a) Must belong to an accessible email account (privacy check)
      // (b) Must be directly linked to this entity OR participate with the lead/contact's email
      const filtered = (candidateEmails ?? []).filter((email: any) => {
        // Privacy check
        const isAccountAccessible =
          (email.email_account_id && accessibleAccountIds.has(email.email_account_id)) ||
          accessibleAccountEmails.has(email.from_email?.toLowerCase()) ||
          accessibleAccountEmails.has(email.to_email?.toLowerCase());

        if (!isAccountAccessible) return false;

        // Specific lead/contact check:
        // Must either be directly linked or involve the lead/contact's email address
        const isDirectlyLinked = directEmailIds.includes(email.id);
        
        let matchesEntityEmail = false;
        if (entityEmailAddress) {
          const fromEmail = email.from_email?.toLowerCase();
          const toEmails = [
            email.to_email?.toLowerCase(), 
            ...(Array.isArray(email.to_emails) ? email.to_emails.map((e:string) => e.toLowerCase()) : [])
          ].filter(Boolean);
          
          const hasLeadAsParticipant = fromEmail === entityEmailAddress || toEmails.includes(entityEmailAddress);
          
          // A valid lead email must be a communication between the Lead and the Workspace.
          // We exclude the Lead's email from Workspace emails to prevent dumping the entire inbox
          // in the edge case where the user uses their own connected email as a test Lead.
          const workspaceEmailsExcludingLead = new Set(
            Array.from(accessibleAccountEmails).filter(e => e !== entityEmailAddress)
          );
          
          const hasWorkspaceAsParticipant = 
            workspaceEmailsExcludingLead.has(fromEmail) || 
            toEmails.some(e => workspaceEmailsExcludingLead.has(e));
            
          if (hasLeadAsParticipant && hasWorkspaceAsParticipant) {
             matchesEntityEmail = true;
          }
        }

        return isDirectlyLinked || matchesEntityEmail;
      });

      const paginatedData = filtered.slice(offset, offset + limit);

      return successDataResponse('Email activity retrieved successfully', {
        data: paginatedData,
        count: filtered.length,
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
    const inboxEmails = accessibleInboxAccounts
      .filter(
        (account: { id: number; email: string }) =>
          !accountEmail || account.email === accountEmail,
      )
      .map((account: { id: number; email: string }) => account.email);

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
      .eq('is_deleted', false);

    const inboxIdentityFilters = [
      `email_account_id.in.(${inboxAccountIds.join(',')})`,
      ...inboxEmails.flatMap((email: string) => [
        `from_email.ilike.${email}`,
        `to_email.ilike.${email}`,
      ]),
    ];

    query = query.or(inboxIdentityFilters.join(','));

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

    const entityType = body.entity_type ?? body.entityType;
    const entityId = body.entity_id ?? body.entityId;

    if (
      isSalesEmailEntityType(entityType) &&
      !(await hasSalesManageEmailPermission(supabase, workspaceId, user.id))
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'You do not have permission to manage Sales email',
        },
        { status: 403 },
      );
    }

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

    const { data: relations, error: relationError } = await (supabase as any)
      .schema('core')
      .from('email_relations')
      .select('entity_type')
      .eq('workspace_id', workspaceId)
      .eq('email_id', id);

    if (relationError) throw relationError;

    const hasSalesRelation = (relations ?? []).some((relation: any) =>
      isSalesEmailEntityType(relation.entity_type),
    );

    if (
      hasSalesRelation &&
      !(await hasSalesManageEmailPermission(supabase, workspaceId, user.id))
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'You do not have permission to manage Sales email',
        },
        { status: 403 },
      );
    }

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
