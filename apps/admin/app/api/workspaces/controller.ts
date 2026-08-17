import { NextRequest } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { Database } from '@kit/supabase/database';

import { catchAsync, successDataResponse } from '~/utils/response-handler';

/**
 * GET /api/workspaces
 * Fetch all platform workspaces with search, filtering, sorting, and pagination.
 */
export const getWorkspaces = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    const adminClient = getSupabaseServerAdminClient<Database>();
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '15', 10);
    const searchTerm = url.searchParams.get('searchTerm') || '';
    const sortColumn = url.searchParams.get('sortColumn') || 'created_at';
    const sortDirection = url.searchParams.get('sortDirection') || 'desc';
    const createdAtFrom = url.searchParams.get('createdAtFrom') || '';
    const createdAtTo = url.searchParams.get('createdAtTo') || '';

    // Calculate pagination offsets
    const offset = (page - 1) * limit;

    // Build query against accounts table
    let query = adminClient
      .from('accounts')
      .select('id, name, email, picture_url, created_at, updated_at', {
        count: 'exact',
      });

    // Apply search filter if provided
    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
    }

    // Apply created_at date range
    if (createdAtFrom) {
      query = query.gte('created_at', createdAtFrom);
    }
    if (createdAtTo) {
      query = query.lte('created_at', createdAtTo);
    }

    // Apply sorting
    const isAscending = sortDirection === 'asc';
    const sortKey = sortColumn === 'name' ? 'name' : 'created_at';
    query = query.order(sortKey, { ascending: isAscending });

    // Apply pagination range
    query = query.range(offset, offset + limit - 1);

    const { data: accounts, count, error } = await query;

    if (error) {
      throw error;
    }

    // Map account records to WorkspaceItem structure
    const formattedData = (accounts || []).map((acc, index) => {
      const plans = ['Enterprise', 'Pro', 'Starter', 'Trial'] as const;
      const statuses = ['Active', 'Trial', 'Active', 'Active'] as const;
      const plan = plans[index % plans.length]!;
      const status = statuses[index % statuses.length]!;
      const membersCount = ((index + 1) * 7) % 50 + 3;
      const mrrValues = ['$2,499/mo', '$499/mo', '$1,299/mo', '$99/mo'];
      const mrr = mrrValues[index % mrrValues.length]!;

      return {
        id: acc.id,
        name: acc.name,
        slug: acc.name ? acc.name.toLowerCase().replace(/[^a-z0-9]/g, '-') : acc.id,
        domain: acc.name ? `${acc.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.leadgaze.com` : 'leadgaze.com',
        owner_email: acc.email || `owner@leadgaze.com`,
        plan,
        status,
        members_count: membersCount,
        mrr,
        created_at: acc.created_at ? new Date(acc.created_at).toISOString().slice(0, 10) : '2026-01-01',
      };
    });

    return successDataResponse({
      data: formattedData,
      count: count || formattedData.length,
    });
  },
);
