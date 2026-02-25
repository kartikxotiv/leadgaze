import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { catchAsync, successDataResponse } from '~/utils/response-handler';
import { getEntityName } from '../_helpers/get-entity-name';

/**
 * GET /api/dashboard
 * Fetch aggregate metrics for the dashboard
 */
export const getDashboardMetrics = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    const supabase = getSupabaseServerClient();
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

    // Check if user is workspace owner
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();

    if (workspaceError) {
      console.error('Workspace fetch error:', workspaceError);
      throw workspaceError;
    }

    const isOwner = workspace?.owner_id === user.id;

    // Current date and 30 days ago for trends
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

    // 1. Get Leads metrics
    let leadsQuery = supabase
      .from('crm_leads')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false);

    let newLeadsQuery = supabase
      .from('crm_leads')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false)
      .gte('created_at', thirtyDaysAgoStr);

    if (!isOwner) {
      const { data: assignedLeadIds } = await supabase
        .from('lead_assignees')
        .select('lead_id')
        .eq('workspace_id', workspaceId)
        .eq('assigned_to_user_id', user.id)
        .eq('assignment_status', 'active');

      const assignedIds = assignedLeadIds?.map((a) => a.lead_id) || [];
      const filterStr = `is_public.eq.true,id.in.(${assignedIds.length > 0 ? assignedIds.join(',') : '00000000-0000-0000-0000-000000000000'}),created_by.eq.${user.id}`;
      leadsQuery = leadsQuery.or(filterStr);
      newLeadsQuery = newLeadsQuery.or(filterStr);
    }

    const { count: leadsTotal } = await leadsQuery;
    const { count: leadsNew } = await newLeadsQuery;

    // 2. Get Contacts metrics
    let contactsQuery = supabase
      .from('crm_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false);

    if (!isOwner) {
      const { data: assignedContactIds } = await (supabase
        .from('contact_assignees' as any)
        .select('contact_id')
        .eq('workspace_id', workspaceId)
        .eq('assigned_to_user_id', user.id)
        .eq('assignment_status', 'active') as any);

      const assignedIds =
        assignedContactIds?.map((a: any) => a.contact_id) || [];
      contactsQuery = contactsQuery.or(
        `is_public.eq.true,id.in.(${assignedIds.length > 0 ? assignedIds.join(',') : '00000000-0000-0000-0000-000000000000'}),created_by.eq.${user.id}`,
      );
    }

    const { count: contactsTotal } = await contactsQuery;

    // 3. Get Accounts metrics
    let accountsQuery = supabase
      .from('crm_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false);

    if (!isOwner) {
      const { data: assignedAccountIds } = await (supabase
        .from('account_assignees' as any)
        .select('account_id')
        .eq('workspace_id', workspaceId)
        .eq('assigned_to_user_id', user.id)
        .eq('assignment_status', 'active') as any);

      const assignedIds =
        assignedAccountIds?.map((a: any) => a.account_id) || [];
      accountsQuery = accountsQuery.or(
        `is_public.eq.true,id.in.(${assignedIds.length > 0 ? assignedIds.join(',') : '00000000-0000-0000-0000-000000000000'}),created_by.eq.${user.id}`,
      );
    }

    const { count: accountsTotal } = await accountsQuery;

    // 4. Get Opportunities metrics
    let opportunitiesQuery = supabase
      .from('crm_opportunities')
      .select('amount')
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false);

    if (!isOwner) {
      const { data: assignedOpportunityIds } = await (supabase
        .from('opportunity_assignees' as any)
        .select('opportunity_id')
        .eq('workspace_id', workspaceId)
        .eq('assigned_to_user_id', user.id)
        .eq('assignment_status', 'active') as any);

      const assignedIds =
        assignedOpportunityIds?.map((a: any) => a.opportunity_id) || [];
      opportunitiesQuery = opportunitiesQuery.or(
        `is_public.eq.true,id.in.(${assignedIds.length > 0 ? assignedIds.join(',') : '00000000-0000-0000-0000-000000000000'}),created_by.eq.${user.id}`,
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

      if (!isOwner) {
        // Use the same OR filter logic as the main queries
        const assigneeTable =
          table === 'crm_leads' ? 'lead_assignees' : 'opportunity_assignees';
        const idField = table === 'crm_leads' ? 'lead_id' : 'opportunity_id';

        const { data: assignedEntityIds } = await (supabase
          .from(assigneeTable as any)
          .select(idField)
          .eq('workspace_id', workspaceId)
          .eq('assigned_to_user_id', user.id)
          .eq('assignment_status', 'active') as any);

        const assignedIds =
          assignedEntityIds?.map((a: any) => a[idField]) || [];

        q = q.or(
          `is_public.eq.true,id.in.(${assignedIds.length > 0 ? assignedIds.join(',') : '00000000-0000-0000-0000-000000000000'}),created_by.eq.${user.id}`,
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
