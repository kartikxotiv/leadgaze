import { SupabaseClient } from '@supabase/supabase-js';
import { GetOpportunitiesParams } from './opportunities.types';

export class OpportunitiesService {
  constructor(private readonly supabase: SupabaseClient) {}

  private applyAccessFilter(
    query: any,
    params: {
      isOwner?: boolean;
      visibleUserIds?: string[];
      assignedOpportunityIds?: string[];
    },
  ) {
    if (!params.isOwner && params.visibleUserIds && params.visibleUserIds.length > 0) {
      const assignedIdsFilter =
        params.assignedOpportunityIds && params.assignedOpportunityIds.length > 0
          ? `,id.in.(${params.assignedOpportunityIds.join(',')})`
          : '';
      return query.or(
        `owner_id.in.(${params.visibleUserIds.join(',')}),created_by.in.(${params.visibleUserIds.join(',')})${assignedIdsFilter}`,
      );
    }
    return query;
  }

  async getOpportunitiesList(params: GetOpportunitiesParams) {
    const {
      workspaceId,
      accountId,
      page = 1,
      limit = 20,
      searchTerm,
      sortColumn,
      sortDirection = 'desc',
      createdAtFrom,
      createdAtTo,
      updatedAtFrom,
      updatedAtTo,
      createdByIds,
    } = params;

    let mainQuery = this.supabase
      .from('vw_crm_opportunities_list')
      .select('*', { count: 'exact' })
      .eq('workspace_id', workspaceId);

    let breakdownQuery = this.supabase
      .from('vw_crm_opportunities_list')
      .select('stage_id, amount')
      .eq('workspace_id', workspaceId);

    mainQuery = this.applyAccessFilter(mainQuery, params);
    breakdownQuery = this.applyAccessFilter(breakdownQuery, params);

    if (createdAtFrom) {
      const dateVal = createdAtFrom.includes('T') ? createdAtFrom : `${createdAtFrom}T00:00:00.000Z`;
      mainQuery = mainQuery.gte('created_at', dateVal);
      breakdownQuery = breakdownQuery.gte('created_at', dateVal);
    }
    if (createdAtTo) {
      const dateVal = createdAtTo.includes('T') ? createdAtTo : `${createdAtTo}T23:59:59.999Z`;
      mainQuery = mainQuery.lte('created_at', dateVal);
      breakdownQuery = breakdownQuery.lte('created_at', dateVal);
    }
    if (updatedAtFrom) {
      const dateVal = updatedAtFrom.includes('T') ? updatedAtFrom : `${updatedAtFrom}T00:00:00.000Z`;
      mainQuery = mainQuery.gte('updated_at', dateVal);
      breakdownQuery = breakdownQuery.gte('updated_at', dateVal);
    }
    if (updatedAtTo) {
      const dateVal = updatedAtTo.includes('T') ? updatedAtTo : `${updatedAtTo}T23:59:59.999Z`;
      mainQuery = mainQuery.lte('updated_at', dateVal);
      breakdownQuery = breakdownQuery.lte('updated_at', dateVal);
    }

    if (createdByIds && createdByIds !== 'all') {
      const ids = createdByIds.split(',').map((id) => id.trim()).filter(Boolean);
      if (ids.length === 1) {
        mainQuery = mainQuery.eq('created_by', ids[0]);
        breakdownQuery = breakdownQuery.eq('created_by', ids[0]);
      } else if (ids.length > 1) {
        mainQuery = mainQuery.in('created_by', ids);
        breakdownQuery = breakdownQuery.in('created_by', ids);
      }
    }

    if (accountId) {
      mainQuery = mainQuery.eq('account_id', accountId);
      breakdownQuery = breakdownQuery.eq('account_id', accountId);
    }

    if (params.stageId && params.stageId !== 'all') {
      mainQuery = mainQuery.eq('stage_id', params.stageId);
    }

    if (searchTerm) {
      const searchFilter = `opportunity_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,account_name.ilike.%${searchTerm}%`;
      mainQuery = mainQuery.or(searchFilter);
      breakdownQuery = breakdownQuery.or(searchFilter);
    }

    const sortMap: Record<string, string> = {
      opportunity_name: 'opportunity_name',
      amount: 'amount',
      expected_close_date: 'expected_close_date',
      probability: 'probability',
      priority: 'priority',
      created_at: 'created_at',
      'account.account_name': 'account_name',
      'stage.status_name': 'stage_name',
      'owner.name': 'owner_name',
      'created_by_account.name': 'created_by_account_name',
      'updated_by_account.name': 'updated_by_account_name',
    };

    const dbSortCol = sortColumn && sortMap[sortColumn] ? sortMap[sortColumn] : 'created_at';
    mainQuery = mainQuery.order(dbSortCol, { ascending: sortDirection === 'asc' });

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    mainQuery = mainQuery.range(from, to);

    const [mainResult, breakdownResult] = await Promise.all([mainQuery, breakdownQuery]);

    if (mainResult.error) throw mainResult.error;
    if (breakdownResult.error) throw breakdownResult.error;

    const stageBreakdownMap: Record<string, { total_amount: number; count: number }> = {};
    (breakdownResult.data || []).forEach((opp: { stage_id: string; amount: number | null }) => {
      const sid = opp.stage_id;
      if (!stageBreakdownMap[sid]) {
        stageBreakdownMap[sid] = { total_amount: 0, count: 0 };
      }
      stageBreakdownMap[sid].total_amount += opp.amount || 0;
      stageBreakdownMap[sid].count += 1;
    });

    const totalAmount = Object.values(stageBreakdownMap).reduce((sum, s) => sum + s.total_amount, 0);

    return {
      data: mainResult.data || [],
      count: mainResult.count || 0,
      totalAmount,
      stageBreakdownMap,
    };
  }
}
