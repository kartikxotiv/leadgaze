import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { Database } from '../../../lib/database.types';
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
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
        { status: 400 },
      );
    }

    // Fetch leads with related data
    const { data: leads, error } = await (
      supabase.from('crm_leads').select(
        `
          *,
          status:entity_statuses(id, status_name, status_key, color, icon),
          source:lead_sources(id, source_name, source_key, color, icon),
          owner:accounts!crm_leads_owner_id_fkey(id, email, name),
          created_by_account:accounts!crm_leads_created_by_fkey(id, email, name)
        `,
      ) as any
    )
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get leads error:', error);
      throw error;
    }

    return successDataResponse(
      'Leads retrieved successfully',
      (leads || []) as LeadWithRelations[],
    );
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
      industry,
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
        industry: industry || null,
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
        status:entity_statuses(id, status_name, status_key, color, icon),
        source:lead_sources(id, source_name, source_key, color, icon),
        owner:accounts!crm_leads_owner_id_fkey(id, email, name),
        created_by_account:accounts!crm_leads_created_by_fkey(id, email, name)
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
      .select('id, status_name, status_key, color, icon')
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

export { getLeads, createLead, getLeadSources, getLeadStatuses };
