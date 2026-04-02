import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { Database } from '~/lib/database.types';
import { getHierarchyVisibleUserIds } from '~/lib/permissions/hierarchy-utils';
import { catchAsync, successDataResponse } from '~/utils/response-handler';
import { getEntityName } from '../_helpers/get-entity-name';

/**
 * GET /api/dashboard
 * Fetch aggregate metrics for the dashboard
 */
export const getDashboardMetrics = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    const supabase = getSupabaseServerClient();
    const adminClient = getSupabaseServerAdminClient<Database>();
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
        { status: 400 },
      );
    }

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Resolve account id used by CRM/workspace tables.
    let actorAccountId = user.id;
    const { data: accountById } = await adminClient
      .from('accounts')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!accountById?.id && user.email) {
      const { data: accountByEmail } = await adminClient
        .from('accounts')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();

      if (accountByEmail?.id) {
        actorAccountId = accountByEmail.id;
      }
    }

    // Check if user is workspace owner
    const { data: workspace, error: workspaceError } = await adminClient
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();

    if (workspaceError) {
      console.error('Workspace fetch error:', workspaceError);
      throw workspaceError;
    }

    const isOwner =
      workspace?.owner_id === actorAccountId || workspace?.owner_id === user.id;

    const { data: membership } = await adminClient
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', actorAccountId)
      .eq('status', 'accepted')
      .maybeSingle();

    if (!isOwner && !membership) {
      return NextResponse.json(
        { message: 'Forbidden: You are not a member of this workspace' },
        { status: 403 },
      );
    }

    let hierarchyFilter:
      | { type: 'all' }
      | { type: 'restricted'; userIds: string[] } = { type: 'all' };

    if (!isOwner) {
      hierarchyFilter = await getHierarchyVisibleUserIds(
        adminClient,
        workspaceId,
        actorAccountId,
      );
    }

    // Current date and 30 days ago for trends
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

    // 1. Get Leads metrics
    let leadsQuery = adminClient
      .from('crm_leads')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false);

    let newLeadsQuery = adminClient
      .from('crm_leads')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false)
      .gte('created_at', thirtyDaysAgoStr);

    if (!isOwner && hierarchyFilter.type === 'restricted') {
      const userIds = hierarchyFilter.userIds;
      const leadsVisibilityFilter = `owner_id.in.(${userIds.join(',')}),created_by.in.(${userIds.join(',')})`;
      leadsQuery = leadsQuery.or(leadsVisibilityFilter);
      newLeadsQuery = newLeadsQuery.or(leadsVisibilityFilter);
    }

    const { count: leadsTotal } = await leadsQuery;
    const { count: leadsNew } = await newLeadsQuery;

    const hierarchyUserIds =
      hierarchyFilter.type === 'restricted' ? hierarchyFilter.userIds : null;

    // 2. Get Contacts metrics
    let contactsQuery = adminClient
      .from('crm_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false);

    if (!isOwner && hierarchyUserIds) {
      contactsQuery = contactsQuery.or(
        `owner_id.in.(${hierarchyUserIds.join(',')}),created_by.in.(${hierarchyUserIds.join(',')})`,
      );
    }

    const { count: contactsTotal } = await contactsQuery;

    // 3. Get Accounts metrics
    let accountsQuery = adminClient
      .from('crm_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false);

    if (!isOwner && hierarchyUserIds) {
      accountsQuery = accountsQuery.or(
        `owner_id.in.(${hierarchyUserIds.join(',')}),created_by.in.(${hierarchyUserIds.join(',')})`,
      );
    }

    const { count: accountsTotal } = await accountsQuery;

    // 4. Get Opportunities metrics
    let opportunitiesQuery = adminClient
      .from('crm_opportunities')
      .select('amount')
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false);

    if (!isOwner && hierarchyUserIds) {
      opportunitiesQuery = opportunitiesQuery.or(
        `owner_id.in.(${hierarchyUserIds.join(',')}),created_by.in.(${hierarchyUserIds.join(',')})`,
      );
    }

    const { data: opportunitiesData } = await opportunitiesQuery;

    const totalOpportunityAmount = (opportunitiesData || []).reduce(
      (sum, opp) => sum + (Number(opp.amount) || 0),
      0,
    );

    // 5. Build Pipeline Metrics
    // Get all statuses to match keys
    const { data: allStatuses } = await supabase
      .from('entity_statuses')
      .select('id, status_key, module:crm_modules(module_key)')
      .eq('workspace_id', workspaceId);

    const getStatusId = (moduleKey: string, statusKey: string) => {
      return allStatuses?.find(
        (s: any) =>
          s.status_key === statusKey && s.module?.module_key === moduleKey,
      )?.id;
    };

    const pipelineKeys = {
      newLeads: getStatusId('leads', 'new'),
      contacted: getStatusId('leads', 'contacted'),
      qualified: getStatusId('leads', 'qualified'),
      proposalSent: getStatusId('opportunities', 'propose'),
      won: getStatusId('opportunities', 'closed_won'),
    };

    const getCountForStatus = async (table: string, statusId?: string) => {
      if (!statusId) return 0;
      let q = supabase
        .from(table as any)
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('is_deleted', false)
        .eq(table === 'crm_opportunities' ? 'stage_id' : 'status_id', statusId);

      if (
        !isOwner &&
        hierarchyUserIds &&
        (table === 'crm_leads' || table === 'crm_opportunities')
      ) {
        q = q.or(
          `owner_id.in.(${hierarchyUserIds.join(',')}),created_by.in.(${hierarchyUserIds.join(',')})`,
        );
      }

      const { count } = await q;
      return count || 0;
    };

    const [newLeadsCount, contactedCount, qualifiedCount, proposalSentCount, wonCount] = await Promise.all([
      getCountForStatus('crm_leads', pipelineKeys.newLeads),
      getCountForStatus('crm_leads', pipelineKeys.contacted),
      getCountForStatus('crm_leads', pipelineKeys.qualified),
      getCountForStatus('crm_opportunities', pipelineKeys.proposalSent),
      getCountForStatus('crm_opportunities', pipelineKeys.won),
    ]);

    // 6. Get Upcoming Tasks (Reminders & Meetings)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    let remindersQuery = supabase
      .from('crm_reminders')
      .select('id, title, due_date, entity_type, entity_id')
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false)
      .eq('is_completed', false)
      .gte('due_date', todayStr)
      .order('due_date', { ascending: true })
      .limit(10);

    let meetingsQuery = supabase
      .from('crm_meetings')
      .select('id, title, start_time, entity_type, entity_id')
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(10);

    if (!isOwner) {
      remindersQuery = remindersQuery.eq('created_by', user.id);
      meetingsQuery = meetingsQuery.eq('created_by', user.id);
    }

    const [{ data: remindersData }, { data: meetingsData }] = await Promise.all([
      remindersQuery,
      meetingsQuery,
    ]);

    // Process reminders
    const processedReminders = await Promise.all(
      (remindersData || []).map(async (reminder: any) => {
        const entityName = await getEntityName(
          supabase,
          reminder.entity_type,
          reminder.entity_id,
        );
        return {
          id: reminder.id,
          title: reminder.title,
          dueDate: reminder.due_date,
          entityType: reminder.entity_type,
          entityId: reminder.entity_id,
          entityName: entityName,
          type: 'reminder',
        };
      }),
    );

    // Process meetings
    const processedMeetings = await Promise.all(
      (meetingsData || []).map(async (meeting: any) => {
        const entityName = await getEntityName(
          supabase,
          meeting.entity_type,
          meeting.entity_id,
        );
        return {
          id: meeting.id,
          title: meeting.title,
          dueDate: meeting.start_time,
          entityType: meeting.entity_type,
          entityId: meeting.entity_id,
          entityName: entityName,
          type: 'meeting',
        };
      }),
    );

    // Combine and sort
    const upcomingTasks = [...processedReminders, ...processedMeetings]
      .sort(
        (a, b) =>
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      )
      .slice(0, 10);

    return successDataResponse('Dashboard metrics retrieved successfully', {
      leads: {
        total: leadsTotal || 0,
        new: leadsNew || 0,
        trend:
          leadsTotal && leadsTotal > 0
            ? Math.round(((leadsNew || 0) / leadsTotal) * 100)
            : 0,
      },
      contacts: {
        total: contactsTotal || 0,
      },
      accounts: {
        total: accountsTotal || 0,
      },
      opportunities: {
        totalAmount: totalOpportunityAmount,
        count: (opportunitiesData || []).length,
      },
      pipeline: {
        newLeads: newLeadsCount,
        contacted: contactedCount,
        qualified: qualifiedCount,
        proposalSent: proposalSentCount,
        won: wonCount,
      },
      upcomingTasks,
    });
  },
);
