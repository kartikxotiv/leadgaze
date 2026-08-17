import { SupabaseClient } from '@supabase/supabase-js';
import { GetContactsParams } from './contacts.types';

export class ContactsService {
  constructor(private readonly supabase: SupabaseClient) {}

  private applyAccessFilter(
    query: any,
    params: {
      isOwner?: boolean;
      visibleUserIds?: string[];
      assignedContactIds?: string[];
    },
  ) {
    if (!params.isOwner && params.visibleUserIds && params.visibleUserIds.length > 0) {
      const assignedIdsFilter =
        params.assignedContactIds && params.assignedContactIds.length > 0
          ? `,id.in.(${params.assignedContactIds.join(',')})`
          : '';
      return query.or(
        `owner_id.in.(${params.visibleUserIds.join(',')}),created_by.in.(${params.visibleUserIds.join(',')})${assignedIdsFilter}`,
      );
    }
    return query;
  }

  async getContactsList(params: GetContactsParams) {
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

    let query = this.supabase
      .from('vw_crm_contacts_list')
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

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    if (searchTerm) {
      query = query.or(
        `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,account_name.ilike.%${searchTerm}%`,
      );
    }

    const sortMap: Record<string, string> = {
      first_name: 'first_name',
      last_name: 'last_name',
      email: 'email',
      job_title: 'job_title',
      created_at: 'created_at',
      'account.account_name': 'account_name',
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
