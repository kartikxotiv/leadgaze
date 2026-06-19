'use server';

import { NextResponse } from 'next/server';

import { catchAsync, successDataResponse } from '../utils/response-handler';
import { hasServiceCloudManageInboxPermission } from './_shared/permissions';
import { assertServiceCloudWorkspaceAccess } from './_shared/workspace-access';

function normalizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() || null;
}

function emailBodyPreview(email: any) {
  return (
    email.text_body ||
    email.snippet ||
    String(email.body || '').replace(/<[^>]+>/g, '')
  );
}

function uniqueThreadKeys(values: Array<string | null | undefined>) {
  const seen = new Set<string>();

  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

function emailThreadKeys(email: any) {
  // Collect all RFC-compliant thread identifiers for matching:
  //   1. Provider thread_key (Gmail hex ID, Outlook conversation ID, etc.)
  //   2. internet_message_id (the email's own Message-ID header)
  //   3. Each token from email_references (space-separated Message-IDs
  //      from the References header)
  //
  // These are registered in ticket_email_threads so that future replies
  // with In-Reply-To or References pointing to any of these identifiers
  // are automatically linked to the ticket.
  const references =
    (email?.email_references as string | null)
      ?.split(' ')
      .map((ref: string) => ref.trim())
      .filter(Boolean) ?? [];

  return uniqueThreadKeys([
    email?.thread_key,
    email?.internet_message_id,
    ...references,
  ]);
}

async function getDefaultStatusId(supabase: any, workspaceId: string) {
  const { data: openStatus, error: openError } = await supabase
    .schema('service_cloud')
    .from('ticket_statuses')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .eq('lifecycle', 'open')
    .order('display_order', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (openError) throw openError;
  if (openStatus?.id) return openStatus.id;

  const { data: defaultStatus, error: defaultError } = await supabase
    .schema('service_cloud')
    .from('ticket_statuses')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .eq('is_default', true)
    .order('display_order', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (defaultError) throw defaultError;
  if (defaultStatus?.id) return defaultStatus.id;

  const { data: firstStatus, error } = await supabase
    .schema('service_cloud')
    .from('ticket_statuses')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return firstStatus?.id ?? null;
}

export const convertCoreEmailToServiceCloudTicketController = catchAsync(
  async ({ request }) => {
    const body = await request.json().catch(() => null);
    const workspaceId = body?.workspace_id ?? body?.workspaceId;
    const emailId = body?.email_id ?? body?.emailId;
    const customerMode = body?.customerMode ?? 'existing';
    const organizationMode = body?.organizationMode ?? 'none';

    if (!workspaceId || !emailId) {
      return NextResponse.json(
        { success: false, message: 'workspace_id and email_id are required' },
        { status: 400 },
      );
    }

    const { supabase, user, error } =
      await assertServiceCloudWorkspaceAccess(workspaceId);
    if (error || !user) return error!;

    const canManageInbox = await hasServiceCloudManageInboxPermission(
      supabase,
      workspaceId,
      user.id,
    );

    if (!canManageInbox) {
      return NextResponse.json(
        {
          success: false,
          message: 'You do not have permission to manage support inboxes',
        },
        { status: 403 },
      );
    }

    const { data: email, error: emailError } = await (supabase as any)
      .schema('core')
      .from('emails')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('id', emailId)
      .maybeSingle();

    if (emailError) throw emailError;
    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email not found' },
        { status: 404 },
      );
    }

    const existingLink = await (supabase as any)
      .schema('service_cloud')
      .from('ticket_emails')
      .select('ticket_id,tickets(*)')
      .eq('workspace_id', workspaceId)
      .eq('email_id', emailId)
      .maybeSingle();

    if (existingLink.error) throw existingLink.error;
    if (existingLink.data?.ticket_id) {
      return successDataResponse('Email is already linked to a ticket', {
        ticket: existingLink.data.tickets,
        alreadyLinked: true,
      });
    }

    const threadKeys = emailThreadKeys(email);

    if (threadKeys.length > 0) {
      const existingThread = await (supabase as any)
        .schema('service_cloud')
        .from('ticket_email_threads')
        .select('ticket_id,tickets(*)')
        .eq('workspace_id', workspaceId)
        .in('thread_key', threadKeys)
        .limit(1)
        .maybeSingle();

      if (existingThread.error) throw existingThread.error;
      if (existingThread.data?.ticket_id) {
        return successDataResponse(
          'Email thread is already linked to a ticket',
          {
            ticket: existingThread.data.tickets,
            alreadyLinked: true,
          },
        );
      }
    }

    let organizationId = body?.organization_id ?? body?.organizationId ?? null;

    if (organizationMode === 'new') {
      const organizationPayload = body?.organization ?? {};
      if (!organizationPayload.name) {
        return NextResponse.json(
          { success: false, message: 'Organization name is required' },
          { status: 400 },
        );
      }

      const { data: organization, error: organizationError } = await (
        supabase as any
      )
        .schema('service_cloud')
        .from('organizations')
        .insert({
          workspace_id: workspaceId,
          name: organizationPayload.name,
          email: normalizeEmail(organizationPayload.email),
          website: organizationPayload.website || null,
          phone: organizationPayload.phone || null,
          created_by: user.id,
          updated_by: user.id,
        })
        .select('id')
        .single();

      if (organizationError) throw organizationError;
      organizationId = organization.id;
    }

    let customerId = body?.customer_id ?? body?.customerId ?? null;
    const inferredCustomerEmail = normalizeEmail(
      body?.customer?.email ||
        (email.direction === 'inbound' ? email.from_email : email.to_email),
    );

    if (customerMode === 'new') {
      const customerPayload = body?.customer ?? {};
      if (!customerPayload.name || !inferredCustomerEmail) {
        return NextResponse.json(
          { success: false, message: 'Customer name and email are required' },
          { status: 400 },
        );
      }

      const { data: customer, error: customerError } = await (supabase as any)
        .schema('service_cloud')
        .from('customers')
        .insert({
          workspace_id: workspaceId,
          organization_id: organizationId,
          name: customerPayload.name,
          email: inferredCustomerEmail,
          phone: customerPayload.phone || null,
          job_title: customerPayload.job_title || null,
          created_by: user.id,
          updated_by: user.id,
        })
        .select('id')
        .single();

      if (customerError) throw customerError;
      customerId = customer.id;
    }

    if (!customerId && inferredCustomerEmail) {
      const { data: matchedCustomer, error: matchError } = await (
        supabase as any
      )
        .schema('service_cloud')
        .from('customers')
        .select('id,organization_id')
        .eq('workspace_id', workspaceId)
        .eq('is_deleted', false)
        .ilike('email', inferredCustomerEmail)
        .maybeSingle();

      if (matchError) throw matchError;
      customerId = matchedCustomer?.id ?? null;
      organizationId =
        organizationId ?? matchedCustomer?.organization_id ?? null;
    }

    const statusId =
      body?.status_id ??
      body?.statusId ??
      (await getDefaultStatusId(supabase, workspaceId));
    if (!statusId) {
      return NextResponse.json(
        { success: false, message: 'No active ticket status found' },
        { status: 400 },
      );
    }

    const { data: ticket, error: ticketError } = await (supabase as any)
      .schema('service_cloud')
      .from('tickets')
      .insert({
        workspace_id: workspaceId,
        subject: body?.subject || email.subject || '(No Subject)',
        description: body?.description || emailBodyPreview(email),
        source: 'email',
        status_id: statusId,
        customer_id: customerId,
        organization_id: organizationId,
        support_email_account_id: email.email_account_id,
        last_customer_response_at:
          email.direction === 'inbound'
            ? (email.received_at ?? email.created_at)
            : null,
        last_agent_response_at:
          email.direction === 'outbound'
            ? (email.sent_at ?? email.created_at)
            : null,
        created_by: user.id,
        updated_by: user.id,
      })
      .select('*')
      .single();

    if (ticketError) throw ticketError;

    const { error: linkError } = await (supabase as any)
      .schema('service_cloud')
      .from('ticket_emails')
      .insert({
        workspace_id: workspaceId,
        ticket_id: ticket.id,
        email_id: email.id,
        customer_id: customerId,
        account_id: user.id,
        email_role:
          email.direction === 'inbound' ? 'initial_request' : 'agent_reply',
        is_public: true,
        created_by: user.id,
      });

    if (linkError) throw linkError;

    if (threadKeys.length > 0) {
      const { error: threadLinkError } = await (supabase as any)
        .schema('service_cloud')
        .from('ticket_email_threads')
        .upsert(
          threadKeys.map((threadKey) => ({
            workspace_id: workspaceId,
            ticket_id: ticket.id,
            thread_key: threadKey,
            email_account_id: email.email_account_id,
            created_by: user.id,
          })),
          { onConflict: 'workspace_id,thread_key' },
        );

      if (threadLinkError) throw threadLinkError;
    }

    return successDataResponse('Email converted to ticket successfully', {
      ticket,
      customerId,
      organizationId,
      alreadyLinked: false,
    });
  },
);

/**
 * Detect whether an email (or its thread) is already linked to a ticket.
 *
 * GET /api/services/detect-email-ticket?workspace_id=X&email_id=Y
 *
 * Checks three levels:
 *   1. Direct link: ticket_emails.email_id = emailId
 *   2. Thread link: email's thread_key matches ticket_email_threads
 *   3. RFC link: email's internet_message_id or references match ticket_email_threads
 *
 * Returns: { ticket: { id, ticket_number, subject } | null }
 */
export const detectEmailTicketController = catchAsync(async ({ request }) => {
  const url = new URL(request.url);
  const workspaceId =
    url.searchParams.get('workspace_id') ?? url.searchParams.get('workspaceId');
  const emailId =
    url.searchParams.get('email_id') ?? url.searchParams.get('emailId');

  if (!workspaceId || !emailId) {
    return NextResponse.json(
      { success: false, message: 'workspace_id and email_id are required' },
      { status: 400 },
    );
  }

  const { supabase, user, error } =
    await assertServiceCloudWorkspaceAccess(workspaceId);
  if (error || !user) return error!;

  const canManageInbox = await hasServiceCloudManageInboxPermission(
    supabase,
    workspaceId,
    user.id,
  );
  if (!canManageInbox) {
    return NextResponse.json({ ticket: null });
  }

  const client = (supabase as any).schema('service_cloud');

  // Level 1: Direct link via ticket_emails
  const { data: directLink } = await client
    .from('ticket_emails')
    .select('ticket_id,tickets!inner(id,ticket_number,subject,is_deleted)')
    .eq('workspace_id', workspaceId)
    .eq('email_id', emailId)
    .eq('tickets.is_deleted', false)
    .limit(1)
    .maybeSingle();

  if (directLink?.tickets) {
    return successDataResponse('Email is linked to a ticket', {
      ticket: directLink.tickets,
    });
  }

  // Level 2 & 3: Thread link via ticket_email_threads
  // Fetch the email's thread identifiers
  const { data: emailRecord } = await (supabase as any)
    .schema('core')
    .from('emails')
    .select('thread_key,internet_message_id,email_references')
    .eq('workspace_id', workspaceId)
    .eq('id', emailId)
    .maybeSingle();

  if (!emailRecord) {
    return successDataResponse('Email not found', { ticket: null });
  }

  // Collect all identifiers that could match a registered thread
  const identifiers: string[] = [];
  if (emailRecord.thread_key) identifiers.push(emailRecord.thread_key);
  if (emailRecord.internet_message_id)
    identifiers.push(emailRecord.internet_message_id);

  // Parse references (space-separated message IDs)
  const refs = (emailRecord.email_references as string | null)
    ?.split(' ')
    .map((r: string) => r.trim())
    .filter(Boolean);
  if (refs) identifiers.push(...refs);

  if (identifiers.length === 0) {
    return successDataResponse('No thread identifiers found', {
      ticket: null,
    });
  }

  // Check ticket_email_threads for any matching identifier
  const { data: threadMatch } = await client
    .from('ticket_email_threads')
    .select('ticket_id,tickets!inner(id,ticket_number,subject,is_deleted)')
    .eq('workspace_id', workspaceId)
    .in('thread_key', identifiers)
    .eq('tickets.is_deleted', false)
    .limit(1)
    .maybeSingle();

  if (threadMatch?.tickets) {
    return successDataResponse('Email thread is linked to a ticket', {
      ticket: threadMatch.tickets,
    });
  }

  return successDataResponse('Email is not linked to any ticket', {
    ticket: null,
  });
});
