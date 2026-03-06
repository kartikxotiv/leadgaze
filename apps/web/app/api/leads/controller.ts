import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { Database } from '../../../lib/database.types';
import { getHierarchyVisibleUserIds } from '../../../lib/permissions/hierarchy-utils';
import {
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';

type Lead = Database['public']['Tables']['crm_leads']['Row'];

type LeadWithRelations = Lead & {
  status?: {
    id: string;
    status_name: string;
    status_key: string;
    color: string;
    icon: string;
  } | null;
  source?: {
    id: string;
    source_name: string;
    source_key: string;
    color: string;
    icon: string;
  } | null;
  owner?: {
    id: string;
    email: string;
    name: string;
  } | null;
  industry?: {
    id: string;
    industry_name: string;
  } | null;
  created_by_account?: {
    id: string;
    email: string;
    name: string;
  } | null;
  updated_by_account?: {
    id: string;
    email: string;
    name: string;
  } | null;
};

/**
 * GET /api/leads
 * Fetch all leads for a workspace
 */
const getLeads = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const adminClient = getSupabaseServerAdminClient<Database>();
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const searchTerm = url.searchParams.get('searchTerm') || '';
    const statusId = url.searchParams.get('statusId') || '';
    const debug = url.searchParams.get('debug') === '1';

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

    // Resolve account id used by CRM tables/workspace_members.
    // In some setups auth user id and accounts.id may differ.
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

    // Validate workspace membership when user is not owner
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
    let visibleUserIds: string[] | null = null;

    if (!isOwner) {
      hierarchyFilter = await getHierarchyVisibleUserIds(
        adminClient,
        workspaceId,
        actorAccountId,
      );
      if (hierarchyFilter.type === 'restricted') {
        visibleUserIds = hierarchyFilter.userIds;
      }
    }

    // Build the query
    let query = adminClient
      .from('crm_leads')
      .select(
        `
          *,
          status:entity_statuses(id, status_name, status_key, color, icon),
          source:lead_sources(id, source_name, source_key, color, icon),
          owner:accounts!crm_leads_owner_id_fkey(id, email, name),
          created_by_account:accounts!crm_leads_created_by_fkey(id, email, name),
          updated_by_account:accounts!crm_leads_updated_by_fkey(id, email, name),
          industry:crm_industries(id, industry_name)
        `,
        { count: 'exact' },
      )
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false);

    if (!isOwner && visibleUserIds && visibleUserIds.length > 0) {
      query = query.or(
        `owner_id.in.(${visibleUserIds.join(',')}),created_by.in.(${visibleUserIds.join(',')})`,
      );
    }

    // Filter by status if provided
    if (statusId && statusId !== 'all') {
      query = query.eq('status_id', statusId);
    }

    // Search term
    if (searchTerm) {
      const parts = searchTerm.split(' ').filter(Boolean);
      let orFilter = `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%,mobile_number.ilike.%${searchTerm}%`;

      if (parts.length >= 2) {
        const part1 = parts[0];
        const part2 = parts[1];
        const { data: nameMatched } = await adminClient
          .from('crm_leads')
          .select('id')
          .eq('workspace_id', workspaceId)
          .or(
            `and(first_name.ilike.%${part1}%,last_name.ilike.%${part2}%),and(first_name.ilike.%${part2}%,last_name.ilike.%${part1}%)`,
          );

        const matchedIds = nameMatched?.map((l) => l.id) || [];
        if (matchedIds.length > 0) {
          orFilter += `,id.in.(${matchedIds.join(',')})`;
        }
      }

      query = query.or(orFilter);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    console.log(`[LEADS API] Executing query for user ${user.id} in workspace ${workspaceId}`);

    const {
      data: leads,
      error,
      count,
    } = await query
      .order('created_at', {
        ascending: false,
      })
      .range(from, to);

    if (error) {
      console.error('Get leads error:', error);
      throw error;
    }

    // For status breakdown, we need a query grouped by status_id
    // We ignore the selected statusId filter here to show the whole distribution
    let breakdownQuery = adminClient
      .from('crm_leads')
      .select('status_id')
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false);

    if (!isOwner && visibleUserIds && visibleUserIds.length > 0) {
      breakdownQuery = breakdownQuery.or(
        `owner_id.in.(${visibleUserIds.join(',')}),created_by.in.(${visibleUserIds.join(',')})`,
      );
    }

    if (searchTerm) {
      const parts = searchTerm.split(' ').filter(Boolean);
      let orFilter = `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%,mobile_number.ilike.%${searchTerm}%`;

      if (parts.length >= 2) {
        const part1 = parts[0];
        const part2 = parts[1];
        const { data: nameMatched } = await adminClient
          .from('crm_leads')
          .select('id')
          .eq('workspace_id', workspaceId)
          .or(
            `and(first_name.ilike.%${part1}%,last_name.ilike.%${part2}%),and(first_name.ilike.%${part2}%,last_name.ilike.%${part1}%)`,
          );

        const matchedIds = nameMatched?.map((l) => l.id) || [];
        if (matchedIds.length > 0) {
          orFilter += `,id.in.(${matchedIds.join(',')})`;
        }
      }

      breakdownQuery = breakdownQuery.or(orFilter);
    }

    // RLS handles visibility for breakdownQuery too

    const { data: breakdownData, error: breakdownError } = await breakdownQuery;

    if (breakdownError) {
      console.error('Get status breakdown error:', breakdownError);
      throw breakdownError;
    }

    const statusBreakdownMap: Record<string, { count: number }> = {};
    (breakdownData || []).forEach((lead) => {
      const statusId = lead.status_id;
      if (!statusBreakdownMap[statusId]) {
        statusBreakdownMap[statusId] = { count: 0 };
      }
      statusBreakdownMap[statusId].count += 1;
    });

    return NextResponse.json({
      message: 'Leads retrieved successfully',
      data: leads || [],
      count: count || 0,
      statusBreakdown: statusBreakdownMap,
      ...(debug
        ? {
            debug: {
              workspaceId,
              userId: user.id,
              actorAccountId,
              isOwner,
              hasAllHierarchyAccess: hierarchyFilter.type === 'all',
              visibleUserIds: visibleUserIds || [],
              membershipStatus: membership ? 'accepted' : null,
            },
          }
        : {}),
    });
  },
);

/**
 * POST /api/leads
 * Create a new lead
 */
const createLead = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const body = await request.json();

    const {
      workspace_id,
      first_name,
      last_name,
      email,
      alt_email,
      phone_number,
      mobile_number,
      linkedin_url,
      company_name,
      company_website,
      company_linkedin_url,
      job_title,
      department,
      industry_id,
      company_size,
      annual_revenue,
      location,
      timezone,
      status_id,
      source_id,
      trigger,
      lead_score,
      owner_id,
      notes,
      tags,
      custom_fields,
    } = body;

    // Validation
    if (!workspace_id || !first_name || !status_id) {
      return NextResponse.json(
        { message: 'workspace_id, first_name, and status_id are required' },
        { status: 400 },
      );
    }

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Create lead
    const { data: lead, error } = await supabase
      .from('crm_leads')
      .insert({
        workspace_id,
        first_name,
        last_name: last_name || null,
        email: email || null,
        alt_email: alt_email || null,
        phone_number: phone_number || null,
        mobile_number: mobile_number || null,
        linkedin_url: linkedin_url || null,
        company_name: company_name || null,
        company_website: company_website || null,
        company_linkedin_url: company_linkedin_url || null,
        job_title: job_title || null,
        department: department || null,
        industry_id: industry_id || null,
        company_size: company_size || null,
        annual_revenue: annual_revenue || null,
        location: location || null,
        timezone: timezone || null,
        status_id,
        source_id: source_id || null,
        trigger: trigger || null,
        lead_score: lead_score || 0,
        owner_id: owner_id || null,
        notes: notes || null,
        tags: tags || [],
        custom_fields: custom_fields || {},
        created_by: user.id,
        is_public: body.is_public ?? true,
      })
      .select(
        `
        *,
        company_website,
        company_linkedin_url,
        status:entity_statuses(id, status_name, status_key, color, icon),
        source:lead_sources(id, source_name, source_key, color, icon),
        owner:accounts!crm_leads_owner_id_fkey(id, email, name),
        created_by_account:accounts!crm_leads_created_by_fkey(id, email, name),
        industry:crm_industries(id, industry_name)
      `,
      )
      .single();

    if (error) {
      console.error('Create lead error:', error);
      throw error;
    }

    return NextResponse.json(
      {
        message: 'Lead created successfully',
        data: lead,
      },
      { status: 201 },
    );
  },
);

/**
 * GET /api/leads/meta/sources
 * Fetch all lead sources for a workspace
 */
const getLeadSources = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
        { status: 400 },
      );
    }

    const { data: sources, error } = await supabase
      .from('lead_sources')
      .select('id, source_name, source_key, color, icon')
      .eq('workspace_id', workspaceId)
      .order('source_name', { ascending: true });

    if (error) {
      console.error('Get sources error:', error);
      throw error;
    }

    return successDataResponse('Sources retrieved successfully', sources || []);
  },
);

/**
 * GET /api/leads/statuses
 * Fetch all lead statuses for a workspace
 */
const getLeadStatuses = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
        { status: 400 },
      );
    }

    const { data: module, error: moduleError } = await supabase
      .from('crm_modules')
      .select('id')
      .eq('module_key', 'leads')
      .single();

    if (moduleError || !module) {
      console.error('Get module error:', moduleError);
      return NextResponse.json(
        { message: 'Failed to retrieve module information' },
        { status: 500 },
      );
    }

    const { data: statuses, error } = await supabase
      .from('entity_statuses')
      .select('id, status_name, status_key, color, icon, is_closed')
      .eq('workspace_id', workspaceId)
      .eq('module_id', module?.id)
      .order('status_name', { ascending: true });

    if (error) {
      console.error('Get statuses error:', error);
      throw error;
    }

    return successDataResponse(
      'Statuses retrieved successfully',
      statuses || [],
    );
  },
);

/**
 * POST /api/leads/sources
 * Create a new lead source
 */
const createLeadSource = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const body = await request.json();
    const { workspace_id, source_name } = body;

    if (!workspace_id || !source_name) {
      return NextResponse.json(
        { message: 'workspace_id and source_name are required' },
        { status: 400 },
      );
    }

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Generate source_key from source_name (lowercase, replace spaces with underscores)
    const source_key = source_name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    // Check if source already exists
    const { data: existing } = await supabase
      .from('lead_sources')
      .select('id')
      .eq('workspace_id', workspace_id)
      .eq('source_key', source_key)
      .single();

    if (existing) {
      return NextResponse.json(
        { message: 'Lead source already exists' },
        { status: 409 },
      );
    }

    // Get the highest sort_order for this workspace
    const { data: maxSort } = await supabase
      .from('lead_sources')
      .select('sort_order')
      .eq('workspace_id', workspace_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const sort_order = (maxSort?.sort_order ?? -1) + 1;

    const { data: source, error } = await supabase
      .from('lead_sources')
      .insert({
        workspace_id,
        source_name: source_name.trim(),
        source_key,
        is_active: true,
        is_system: false,
        sort_order,
        created_by: user.id,
      })
      .select('id, source_name, source_key, color, icon')
      .single();

    if (error) {
      console.error('Create lead source error:', error);
      throw error;
    }

    return successDataResponse('Lead source created successfully', source);
  },
);

export {
  getLeads,
  createLead,
  getLeadSources,
  getLeadStatuses,
  createLeadSource,
};
