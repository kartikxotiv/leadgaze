import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { catchAsync, successDataResponse } from '~/utils/response-handler';

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

    // 5. Get Recent Trends (Last 6 months placeholder or real data)
    // For simplicity, we'll return the totals and new counts
    // In a full implementation, we'd group by month.

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
    });
  },
);
