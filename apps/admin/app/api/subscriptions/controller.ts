import { NextRequest } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { Database } from '@kit/supabase/database';

import { catchAsync, successDataResponse } from '~/utils/response-handler';

export const getSubscriptions = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    const adminClient = getSupabaseServerAdminClient<Database>();
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '25', 10);
    const searchTerm = url.searchParams.get('searchTerm') || '';
    const statusParam = url.searchParams.get('status') || '';
    const statusesFilter = statusParam ? statusParam.split(',') : [];

    const offset = (page - 1) * limit;

    let query = adminClient.schema('core')
      .from('workspace_subscriptions')
      .select(`
        id,
        status,
        workspace_id,
        billing_interval,
        expires_at,
        created_at,
        plans ( plan_name, monthly_price, yearly_price )
      `, {
        count: 'exact',
      });

    if (searchTerm) {
      // Fetch matching workspaces first to filter subscriptions
      const { data: matchedWorkspaces } = await adminClient
        .from('workspaces')
        .select('id')
        .ilike('name', `%${searchTerm}%`);
        
      if (matchedWorkspaces && matchedWorkspaces.length > 0) {
        query = query.in('workspace_id', matchedWorkspaces.map((w: any) => w.id));
      } else {
        // Force empty result if search term yields no workspaces
        query = query.in('workspace_id', []);
      }
    }

    if (statusesFilter.length > 0) {
      if (statusesFilter.includes('Trial')) {
        query = query.eq('status', 'trialing');
      } else if (statusesFilter.includes('Failed Payment')) {
        query = query.eq('status', 'past_due');
      } else if (statusesFilter.includes('Active')) {
        query = query.eq('status', 'active');
      } else {
        query = query.in('status', statusesFilter);
      }
    }

    query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

    const { data: subscriptions, count, error } = await query;

    if (error) {
      console.error('Error fetching subscriptions:', error);
      throw error;
    }

    // Calculate metrics dynamically
    const { data: allSubscriptions } = await adminClient.schema('core')
      .from('workspace_subscriptions')
      .select('status, billing_interval, created_at, cancelled_at, plans(monthly_price, yearly_price)');

    let mrr = 0;
    let activeCount = 0;
    let churnedCount = 0;
    let trialCount = 0;
    let pastDueCount = 0;
    let enterpriseCount = 0;

    let lastMonthMrr = 0;
    let lastMonthActiveCount = 0;
    let lastMonthChurnedCount = 0;
    
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());

    if (allSubscriptions) {
      for (const sub of allSubscriptions) {
        const createdAt = new Date(sub.created_at);
        const cancelledAt = sub.cancelled_at ? new Date(sub.cancelled_at) : null;
        const plan = sub.plans as any;
        
        let price = 0;
        if (plan) {
          if (sub.billing_interval === 'year' && plan.yearly_price) {
            price = plan.yearly_price / 12;
          } else if (plan.monthly_price) {
            price = plan.monthly_price;
          } else if (plan.yearly_price) {
            price = plan.yearly_price / 12;
          }
        }

        // Current Month Metrics
        if (sub.status === 'active' || sub.status === 'trialing') {
          activeCount++;
          mrr += price;
          if (sub.status === 'trialing') trialCount++;
          if (plan && plan.plan_name === 'Enterprise') enterpriseCount++;
        } else if (sub.status === 'canceled' || sub.status === 'past_due') {
          churnedCount++;
          if (sub.status === 'past_due') pastDueCount++;
        }

        // Last Month Metrics (Snapshot from 1 month ago)
        if (createdAt <= oneMonthAgo) {
          const wasActiveLastMonth = !cancelledAt || cancelledAt > oneMonthAgo;
          if (wasActiveLastMonth) {
            lastMonthActiveCount++;
            lastMonthMrr += price;
          } else if (cancelledAt && cancelledAt > twoMonthsAgo && cancelledAt <= oneMonthAgo) {
            lastMonthChurnedCount++;
          }
        }
      }
    }

    const arr = mrr * 12;
    const avgRevPerWorkspace = activeCount > 0 ? mrr / activeCount : 0;
    
    // Churn rate = churned / (active + churned)
    const totalEverActive = activeCount + churnedCount;
    const churnRateDecimal = totalEverActive > 0 ? (churnedCount / totalEverActive) : 0;
    const churnRatePercent = (churnRateDecimal * 100).toFixed(1);

    // Last month churn rate
    const lastMonthTotalEverActive = lastMonthActiveCount + lastMonthChurnedCount;
    const lastMonthChurnRateDecimal = lastMonthTotalEverActive > 0 ? (lastMonthChurnedCount / lastMonthTotalEverActive) : 0;
    
    let ltv = 0;
    if (churnRateDecimal > 0) {
      ltv = avgRevPerWorkspace / churnRateDecimal;
    } else if (activeCount > 0) {
      ltv = avgRevPerWorkspace * 24; 
    }

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

    const mrrDiff = mrr - lastMonthMrr;
    const mrrTrendText = mrrDiff >= 0 
      ? `+${formatCurrency(mrrDiff)} vs last month` 
      : `${formatCurrency(mrrDiff)} vs last month`;

    const churnDiff = churnRateDecimal - lastMonthChurnRateDecimal;
    const churnTrendText = churnDiff > 0
      ? `+${(churnDiff * 100).toFixed(1)}% vs last month`
      : `${(churnDiff * 100).toFixed(1)}% vs last month`;

    const metrics = {
      mrr: formatCurrency(mrr),
      mrr_trend: mrrTrendText,
      mrr_trend_positive: mrrDiff >= 0,
      
      arr: formatCurrency(arr),
      arr_trend: 'Projected',
      
      avg_rev_per_workspace: formatCurrency(avgRevPerWorkspace),
      avg_rev_trend: 'Per active WS',
      
      ltv: formatCurrency(ltv),
      ltv_trend: 'Avg customer',
      
      churn_rate: `${churnRatePercent}%`,
      churn_trend: churnTrendText,
      churn_trend_positive: churnDiff <= 0, // Lower churn is positive
      
      counts: {
        all: allSubscriptions ? allSubscriptions.length : 0,
        failed_payment: pastDueCount,
        trial: trialCount,
        enterprise: enterpriseCount
      }
    };

    // Fetch workspaces for the results to populate names
    const workspaceIds = (subscriptions || []).map((sub: any) => sub.workspace_id);
    let workspacesMap: Record<string, any> = {};
    
    if (workspaceIds.length > 0) {
      const { data: workspacesData } = await adminClient
        .from('workspaces')
        .select('id, name, slug')
        .in('id', workspaceIds);
        
      if (workspacesData) {
        workspacesData.forEach((w: any) => {
          workspacesMap[w.id] = w;
        });
      }
    }

    const formattedData = (subscriptions || []).map((sub: any) => {
      const workspace = workspacesMap[sub.workspace_id];
      const planName = sub.plans?.plan_name || 'Unknown Plan';
      
      let amount = '$0/mo';
      if (sub.billing_interval === 'year' && sub.plans?.yearly_price) {
        amount = `$${sub.plans.yearly_price}/yr`;
      } else if (sub.plans?.monthly_price) {
        amount = `$${sub.plans.monthly_price}/mo`;
      } else if (sub.plans?.yearly_price) {
        amount = `$${(sub.plans.yearly_price / 12).toFixed(0)}/mo`;
      }

      let displayStatus = 'Active';
      if (sub.status === 'trialing') displayStatus = 'Trial';
      else if (sub.status === 'past_due') displayStatus = 'Suspended'; // Mapping past due to suspended for UI
      else if (sub.status === 'canceled') displayStatus = 'Suspended';
      else displayStatus = 'Active';

      return {
        id: sub.id,
        workspace_name: workspace?.name || 'Unknown',
        plan: planName,
        amount,
        billing_cycle: sub.billing_interval === 'year' ? 'Yearly' : 'Monthly',
        status: displayStatus,
        renewal_date: sub.expires_at ? new Date(sub.expires_at).toISOString().slice(0, 10) : 'N/A',
      };
    });



    return successDataResponse({
      data: formattedData,
      count: count || formattedData.length,
      metrics,
    });
  }
);
