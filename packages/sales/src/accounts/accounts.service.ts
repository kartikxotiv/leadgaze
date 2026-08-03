import { SupabaseClient } from '@supabase/supabase-js';
import { GetAccountsParams } from './accounts.types';

export class AccountsService {
  constructor(private readonly supabase: SupabaseClient) {}

  private applyAccessFilter(
    query: any,
    params: {
      isOwner?: boolean;
      visibleUserIds?: string[];
      assignedAccountIds?: string[];
    },
  ) {
    if (!params.isOwner && params.visibleUserIds && params.visibleUserIds.length > 0) {
      const assignedIdsFilter =
        params.assignedAccountIds && params.assignedAccountIds.length > 0
          ? `,id.in.(${params.assignedAccountIds.join(',')})`
          : '';
      return query.or(
        `owner_id.in.(${params.visibleUserIds.join(',')}),created_by.in.(${params.visibleUserIds.join(',')})${assignedIdsFilter}`,
      );
    }
    return query;
  }

  async getAccountsList(params: GetAccountsParams) {
    const {
      workspaceId,
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

    let query = this.supabase
      .from('vw_crm_accounts_list')
      .select('*', { count: 'exact' })
      .eq('workspace_id', workspaceId);

    query = this.applyAccessFilter(query, params);

    if (createdAtFrom)
      query = query.gte(
        'created_at',
        createdAtFrom.includes('T') ? createdAtFrom : `${createdAtFrom}T00:00:00.000Z`,
      );
    if (createdAtTo)
      query = query.lte(
        'created_at',
        createdAtTo.includes('T') ? createdAtTo : `${createdAtTo}T23:59:59.999Z`,
      );
    if (updatedAtFrom)
      query = query.gte(
        'updated_at',
        updatedAtFrom.includes('T') ? updatedAtFrom : `${updatedAtFrom}T00:00:00.000Z`,
      );
    if (updatedAtTo)
      query = query.lte(
        'updated_at',
        updatedAtTo.includes('T') ? updatedAtTo : `${updatedAtTo}T23:59:59.999Z`,
      );

    if (createdByIds && createdByIds !== 'all') {
      const ids = createdByIds
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      if (ids.length === 1) {
        query = query.eq('created_by', ids[0]);
      } else if (ids.length > 1) {
        query = query.in('created_by', ids);
      }
    }

    if (searchTerm) {
      query = query.or(
        `account_name.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%,industry_name.ilike.%${searchTerm}%`,
      );
    }

    const sortMap: Record<string, string> = {
      account_name: 'account_name',
      website: 'website',
      phone_number: 'phone_number',
      company_size: 'company_size',
      billing_street: 'billing_street',
      billing_city: 'billing_city',
      billing_state: 'billing_state',
      billing_postal_code: 'billing_postal_code',
      billing_country: 'billing_country',
      created_at: 'created_at',
      'industry.industry_name': 'industry_name',
      'owner.name': 'owner_name',
      'created_by_account.name': 'created_by_account_name',
      'updated_by_account.name': 'updated_by_account_name',
    };

    const dbSortCol = sortColumn && sortMap[sortColumn] ? sortMap[sortColumn] : 'created_at';
    query = query.order(dbSortCol, { ascending: sortDirection === 'asc' });

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    return { data: data || [], count: count || 0 };
  }
}
