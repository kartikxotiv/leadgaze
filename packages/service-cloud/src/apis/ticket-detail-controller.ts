'use server';

import { NextResponse } from 'next/server';

import { catchAsync, successDataResponse } from '../utils/response-handler';
import { assertServiceCloudWorkspaceAccess } from './_shared/workspace-access';

export const getServiceCloudTicketDetailController = catchAsync(
  async ({ request, params }) => {
    const ticketId = params?.ticketId ?? '';
    const url = new URL(request.url);
    const workspaceId =
      url.searchParams.get('workspaceId') ??
      url.searchParams.get('workspace_id');

    if (!workspaceId || !ticketId) {
      return NextResponse.json(
        { success: false, message: 'workspaceId and ticketId are required' },
        { status: 400 },
      );
    }

    const { supabase, user, error } =
      await assertServiceCloudWorkspaceAccess(workspaceId);
    if (error || !user) return error!;

    const client = (supabase as any).schema('service_cloud');

    const { data: ticket, error: ticketError } = await client
      .from('tickets')
      .select(
        `
      *,
      status:ticket_statuses(*),
      priority:ticket_priorities(*),
      category:ticket_categories(*),
      customer:customers(*),
      organization:organizations(*)
    `,
      )
      .eq('workspace_id', workspaceId)
      .eq('id', ticketId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (ticketError) throw ticketError;
    if (!ticket)
      return NextResponse.json(
        { success: false, message: 'Ticket not found' },
        { status: 404 },
      );

    const [
      ticketEmails,
      timeEntries,
      activities,
      statuses,
      priorities,
      categories,
      workspaceMembers,
      ticketAssignees,
      ticketEmailThreads,
    ] = await Promise.all([
      client
        .from('ticket_emails')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true }),
      client
        .from('time_entries')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('ticket_id', ticketId)
        .order('logged_date', { ascending: false }),
      client
        .from('ticket_activities')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false })
        .limit(20),
      client
        .from('ticket_statuses')
        .select('id, name, lifecycle, color, display_order')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
      client
        .from('ticket_priorities')
        .select('id, name, priority_key, severity_order, color')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .order('severity_order', { ascending: true }),
      client
        .from('ticket_categories')
        .select('id, name, category_key, display_order')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
      // Only fetch members who have service cloud module access
      (supabase as any)
        .from('workspace_members')
        .select(`
          user_id,
          role_id(
            role_permissions(
              can_access,
              crm_module_features!module_feature_id(
                crm_modules!module_id(module_key)
              )
            )
          )
        `)
        .eq('workspace_id', workspaceId)
        .eq('status', 'accepted'),
      client
        .from('ticket_assignees')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true }),
      client
        .from('ticket_email_threads')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true }),
    ]);

    if (ticketEmails.error) throw ticketEmails.error;
    if (timeEntries.error) throw timeEntries.error;
    if (activities.error) throw activities.error;
    if (statuses.error) throw statuses.error;
    if (priorities.error) throw priorities.error;
    if (categories.error) throw categories.error;
    if (workspaceMembers.error) throw workspaceMembers.error;
    if (ticketAssignees.error) throw ticketAssignees.error;
    if (ticketEmailThreads.error) throw ticketEmailThreads.error;

    // Filter workspace members to only those with service cloud module access
    const filteredMemberIds = (workspaceMembers.data ?? [])
      .filter((member: any) => {
        const role = member.role_id;
        const permissions = role?.role_permissions || [];
        return permissions.some((p: any) => {
          const moduleKey = p.crm_module_features?.crm_modules?.module_key;
          return p.can_access && moduleKey?.startsWith('service_cloud');
        });
      })
      .map((member: any) => member.user_id);

    // Include workspace owner (they have implicit full access to all modules)
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .maybeSingle();

    const serviceCloudMemberIds = Array.from(
      new Set(
        workspace?.owner_id
          ? [...filteredMemberIds, workspace.owner_id]
          : filteredMemberIds,
      ),
    );

    const emailIds = Array.from(
      new Set(
        (ticketEmails.data ?? [])
          .map((item: any) => item.email_id)
          .filter(Boolean),
      ),
    );

    const memberIds = Array.from(
      new Set(
        [
          ...serviceCloudMemberIds,
          ...(ticketAssignees.data ?? []).map(
            (assignee: any) => assignee.account_id,
          ),
          ...(activities.data ?? []).map(
            (activity: any) => activity.actor_account_id,
          ),
        ].filter(Boolean),
      ),
    );

    // Optimized: run core emails + member accounts in parallel (they're independent)
    const [coreEmailsResult, memberAccountsResult] = await Promise.all([
      emailIds.length > 0
        ? (supabase as any)
            .schema('core')
            .from('emails')
            .select('*')
            .eq('workspace_id', workspaceId)
            .in('id', emailIds)
        : Promise.resolve({ data: [], error: null }),
      memberIds.length > 0
        ? supabase
            .from('accounts')
            .select('id, name, email, picture_url')
            .in('id', memberIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (coreEmailsResult.error) throw coreEmailsResult.error;
    const linkedEmails: any[] = coreEmailsResult.data ?? [];
    const emailById = new Map(
      linkedEmails.map((email: any) => [email.id, email]),
    );

    if (memberAccountsResult.error) throw memberAccountsResult.error;
    const memberAccounts = memberAccountsResult.data;

    // Thread emails depend on core emails (need thread_keys), so run separately
    const threadKeys = Array.from(
      new Set(
        [
          ...(ticketEmailThreads.data ?? []).map(
            (thread: any) => thread.thread_key,
          ),
          ...linkedEmails.map((email: any) => email.thread_key),
        ].filter(Boolean),
      ),
    );

    if (threadKeys.length > 0) {
      const { data: threadEmails, error: threadEmailError } = await (
        supabase as any
      )
        .schema('core')
        .from('emails')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_deleted', false)
        .in('thread_key', threadKeys);

      if (threadEmailError) throw threadEmailError;
      (threadEmails ?? []).forEach((email: any) =>
        emailById.set(email.id, email),
      );
    }

    const memberAccountById = new Map(
      (memberAccounts ?? []).map((account: any) => [account.id, account]),
    );
    const linkedEmailById = new Map(
      (ticketEmails.data ?? []).map((item: any) => [item.email_id, item]),
    );
    const emails = Array.from(emailById.values())
      .map((email: any) => ({
        ...(linkedEmailById.get(email.id) ?? {
          id: `thread:${email.id}`,
          workspace_id: workspaceId,
          ticket_id: ticketId,
          email_id: email.id,
          email_role: 'thread_message',
          is_public: true,
          created_at: email.created_at,
        }),
        email,
      }))
      .sort((left: any, right: any) => {
        const leftDate =
          left.email?.received_at ??
          left.email?.sent_at ??
          left.email?.created_at ??
          left.created_at;
        const rightDate =
          right.email?.received_at ??
          right.email?.sent_at ??
          right.email?.created_at ??
          right.created_at;

        return new Date(leftDate).getTime() - new Date(rightDate).getTime();
      });

    return successDataResponse('Ticket detail retrieved successfully', {
      ticket,
      emails,
      timeEntries: timeEntries.data ?? [],
      activities: (activities.data ?? []).map((activity: any) => ({
        ...activity,
        actor: memberAccountById.get(activity.actor_account_id) ?? null,
      })),
      assignees: (ticketAssignees.data ?? []).map((assignee: any) => ({
        ...assignee,
        account: memberAccountById.get(assignee.account_id) ?? null,
      })),
      emailThreads: ticketEmailThreads.data ?? [],
      lookups: {
        statuses: statuses.data ?? [],
        priorities: priorities.data ?? [],
        categories: categories.data ?? [],
        members: (memberAccounts ?? []).filter(
          (account: any) => serviceCloudMemberIds.includes(account.id),
        ),
      },
    });
  },
);

export const logServiceCloudTicketTimeController = catchAsync(
  async ({ request, params }) => {
    const ticketId = params?.ticketId ?? '';
    const body = await request.json().catch(() => null);
    const workspaceId = body?.workspace_id ?? body?.workspaceId;
    const durationSeconds = Number(
      body?.duration_seconds ?? body?.durationSeconds ?? 0,
    );

    if (!workspaceId || !ticketId || durationSeconds <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'workspaceId, ticketId, and duration are required',
        },
        { status: 400 },
      );
    }

    const { supabase, user, error } =
      await assertServiceCloudWorkspaceAccess(workspaceId);
    if (error || !user) return error!;

    const { data, error: insertError } = await (supabase as any)
      .schema('service_cloud')
      .from('time_entries')
      .insert({
        workspace_id: workspaceId,
        ticket_id: ticketId,
        account_id: user.id,
        duration_seconds: durationSeconds,
        description: body?.description || null,
        billable: Boolean(body?.billable),
        logged_date:
          body?.logged_date ??
          body?.loggedDate ??
          new Date().toISOString().slice(0, 10),
        created_by: user.id,
        updated_by: user.id,
      })
      .select('*')
      .single();

    if (insertError) throw insertError;

    return successDataResponse('Time logged successfully', data);
  },
);
