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

    // Current date and 30 days ago for trends
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

    // 1. Get Leads metrics
    const { count: leadsTotal } = await supabase
      .from('crm_leads')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false);

    const { count: leadsNew } = await supabase
      .from('crm_leads')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false)
      .gte('created_at', thirtyDaysAgoStr);

    // 2. Get Contacts metrics
    const { count: contactsTotal } = await supabase
      .from('crm_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false);

    // 3. Get Accounts metrics
    const { count: accountsTotal } = await supabase
      .from('crm_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false);

    // 4. Get Opportunities metrics
    const { data: opportunitiesData } = await supabase
      .from('crm_opportunities')
      .select('amount')
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false);

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
