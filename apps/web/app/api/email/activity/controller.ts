/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  getAccessibleInboxEmails,
  hasWorkspaceEmailFeatureAccess,
} from '~/lib/email/email-account-access';
import {
  catchAsync,
  successDataResponse,
  successListDataResponse,
} from '~/utils/response-handler';
import { getEntityName } from '../../_helpers/get-entity-name';
import { getRelatedEntityIds } from '../../_helpers/get-related-entities';

export const getEmailActivity = catchAsync(async ({ request }) => {
  const { searchParams } = new URL(request.url);
  const entityId = searchParams.get('entityId');
  const entityType = searchParams.get('entityType');
  const workspaceId = searchParams.get('workspaceId');
  const accountEmail = searchParams.get('accountEmail');
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  if (!workspaceId && (!entityId || !entityType)) {
    return NextResponse.json(
      { error: 'Missing workspaceId or entityId/entityType' },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServerClient();

  // ── Entity-scoped path: cross-module fan-out ──────────────────────────────
  if (entityId && entityType) {
    const relatedEntities = await getRelatedEntityIds(supabase, entityType, entityId);

    const emailPromises = relatedEntities.map(({ entity_type, entity_id }) =>
      supabase
        .from('emails')
        .select('*')
        .eq('entity_id', entity_id)
        .eq('entity_type', entity_type),
    );

    const results = await Promise.all(emailPromises);
    const allEmails = results.flatMap((r) => r.data || []);

    // Deduplicate by email id
    const unique = Array.from(
      new Map(allEmails.map((e) => [e.id, e])).values(),
    );

    // Sort: received_at DESC, fallback to created_at DESC
    unique.sort((a, b) => {
      const aTime = new Date(a.received_at || a.created_at).getTime();
      const bTime = new Date(b.received_at || b.created_at).getTime();
      return bTime - aTime;
    });

    const totalCount = unique.length;

    // Apply pagination to the combined sorted result
    const paginated = unique.slice(offset, offset + limit);

    // Annotate each email with the origin entity name
    const withNames = await Promise.all(
      paginated.map(async (email) => ({
        ...email,
        entity_name: await getEntityName(supabase, email.entity_type, email.entity_id),
      })),
    );

    return successListDataResponse(withNames, {
      object: 'email_activity',
      count: totalCount,
      limit,
      offset,
    });
  }

  // ── Workspace inbox path (unchanged) ─────────────────────────────────────
  let query = supabase.from('emails').select('*', { count: 'exact' });

  if (workspaceId) {
    const canViewInbox = await hasWorkspaceEmailFeatureAccess(
      supabase,
      workspaceId,
      'view_inbox',
    );

    if (!canViewInbox) {
      return NextResponse.json(
        { error: 'You do not have permission to view inbox emails' },
        { status: 403 },
      );
    }

    query = query.eq('workspace_id', workspaceId);

    const accessibleInboxEmails = await getAccessibleInboxEmails(
      supabase,
      workspaceId,
    );

    if (accessibleInboxEmails.length === 0) {
      return successListDataResponse([], {
        object: 'email_activity',
        count: 0,
        limit,
        offset,
      });
    }

    const requestedAccountEmail = accountEmail?.toLowerCase();
    if (
      requestedAccountEmail &&
      !accessibleInboxEmails.includes(requestedAccountEmail)
    ) {
      return NextResponse.json(
        { error: 'You do not have access to this inbox' },
        { status: 403 },
      );
    }

    const inboxEmails = requestedAccountEmail
      ? [requestedAccountEmail]
      : accessibleInboxEmails;

    const orFilters = inboxEmails.flatMap((email) => [
      `from_email.eq.${email}`,
      `to_emails.ilike.%${email}%`,
    ]);

    query = query.or(orFilters.join(','));
  }

  const {
    data: emails,
    error,
    count,
  } = await query
    .order('received_at', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  return successListDataResponse(emails, {
    object: 'email_activity',
    count,
    limit,
    offset,
  });
});

export const saveEmailActivity = catchAsync(async ({ request }) => {
  const payload: any = await request.json();
  const {
    id,
    workspace_id,
    entity_id,
    entity_type,
    subject,
    body,
    to_emails,
    cc_emails,
    bcc_emails,
    status,
    scheduled_at,
    from_email,
  } = payload;

  if (!workspace_id || !entity_id || !entity_type) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServerClient();

  const upsertData: any = {
    workspace_id,
    entity_id,
    entity_type,
    subject,
    html_body: body,
    to_emails,
    cc_emails: Array.isArray(cc_emails) ? cc_emails.join(', ') : cc_emails,
    bcc_emails: Array.isArray(bcc_emails) ? bcc_emails.join(', ') : bcc_emails,
    status: status || 'draft',
    scheduled_at: scheduled_at || null,
    from_email,
    direction: 'outbound',
  };

  if (id && !id.includes('.')) {
    upsertData.id = id;
  }

  const { data: email, error } = await supabase
    .from('emails')
    .upsert(upsertData)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return successDataResponse(email);
});

export const deleteEmailActivity = catchAsync(async ({ request }) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const { error } = await supabase.from('emails').delete().eq('id', id);

  if (error) {
    throw error;
  }

  return successDataResponse('Email activity deleted successfully');
});
