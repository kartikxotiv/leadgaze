import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { Database } from '~/lib/database.types';
import { catchAsync, successDataResponse } from '~/utils/response-handler';

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
};

const getLeadById = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const leadId = params?.id;

    if (!leadId) {
      return NextResponse.json(
        { message: 'leadId is required' },
        { status: 400 },
      );
    }

    const { data: lead, error } = await (
      supabase.from('crm_leads').select(
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
      ) as any
    )
      .eq('id', leadId)
      .eq('is_deleted', false)
      .single();

    if (error) {
      console.error('Get lead error:', error);
      throw error;
    }

    const { data: account } = await supabase
      .from('crm_accounts')
      .select()
      .eq('created_from_lead_id', leadId);

    if (!lead) {
      return NextResponse.json({ message: 'Lead not found' }, { status: 404 });
    }

    if (account?.length) {
      lead.is_converted_to_account = true;
      lead.converted_account_id = account[0]?.id || null;
    } else {
      lead.is_converted_to_account = false;
      lead.converted_account_id = null;
    }
    return successDataResponse(
      'Lead retrieved successfully',
      lead as LeadWithRelations,
    );
  },
);

/**
 * PATCH /api/leads/[leadId]
 * Update an existing lead
 */
const updateLead = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const leadId = params?.id;

    if (!leadId) {
      return NextResponse.json(
        { message: 'leadId is required' },
        { status: 400 },
      );
    }

    const body = await request.json();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Update lead - support partial updates
    const updateData: any = {};

    // Only include fields that are provided
    if (body.first_name !== undefined) updateData.first_name = body.first_name;
    if (body.last_name !== undefined)
      updateData.last_name = body.last_name || null;
    if (body.email !== undefined) updateData.email = body.email || null;
    if (body.alt_email !== undefined)
      updateData.alt_email = body.alt_email || null;
    if (body.phone_number !== undefined)
      updateData.phone_number = body.phone_number || null;
    if (body.mobile_number !== undefined)
      updateData.mobile_number = body.mobile_number || null;
    if (body.linkedin_url !== undefined)
      updateData.linkedin_url = body.linkedin_url || null;
    if (body.company_name !== undefined)
      updateData.company_name = body.company_name || null;
    if (body.company_website !== undefined)
      updateData.company_website = body.company_website || null;
    if (body.company_linkedin_url !== undefined)
      updateData.company_linkedin_url = body.company_linkedin_url || null;
    if (body.job_title !== undefined)
      updateData.job_title = body.job_title || null;
    if (body.department !== undefined)
      updateData.department = body.department || null;
    if (body.industry_id !== undefined)
      updateData.industry_id = body.industry_id || null;
    if (body.company_size !== undefined)
      updateData.company_size = body.company_size || null;
    if (body.annual_revenue !== undefined)
      updateData.annual_revenue = body.annual_revenue || null;
    if (body.location !== undefined)
      updateData.location = body.location || null;
    if (body.timezone !== undefined)
      updateData.timezone = body.timezone || null;
    if (body.status_id !== undefined) updateData.status_id = body.status_id;
    if (body.source_id !== undefined)
      updateData.source_id = body.source_id || null;
    if (body.trigger !== undefined) updateData.trigger = body.trigger || null;
    if (body.lead_score !== undefined) updateData.lead_score = body.lead_score;
    if (body.owner_id !== undefined)
      updateData.owner_id = body.owner_id || null;
    if (body.notes !== undefined) updateData.notes = body.notes || null;
    
    // Get the lead to check permissions
    const { data: existingLead } = await supabase
      .from('crm_leads')
      .select('workspace_id, owner_id, created_by')
      .eq('id', leadId)
      .single();

    if (!existingLead) {
      return NextResponse.json({ message: 'Lead not found' }, { status: 404 });
    }

    // Get workspace to check if user is owner
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', existingLead.workspace_id)
      .single();

    const isWorkspaceOwner = workspace?.owner_id === user.id;
    const isOwner = existingLead.owner_id === user.id;
    const isCreator = existingLead.created_by === user.id;

    // Check general edit permission
    let hasEditPermission = isWorkspaceOwner || isOwner || isCreator;

    if (!hasEditPermission) {
      const { data: member } = await supabase
        .from('workspace_members')
        .select('role_id')
        .eq('user_id', user.id)
        .eq('workspace_id', existingLead.workspace_id)
        .single();

      if (member?.role_id) {
        const { data: permission } = await supabase
          .from('role_permissions')
          .select(
            `
            can_access,
            crm_module_features!inner (
              feature_key,
              crm_modules!inner (
                module_key
              )
            )
          `,
          )
          .eq('role_id', member.role_id)
          .eq('crm_module_features.feature_key', 'edit')
          .eq('crm_module_features.crm_modules.module_key', 'leads')
          .single();

        if (permission?.can_access) {
          hasEditPermission = true;
        }
      }
    }

    if (!hasEditPermission) {
      return NextResponse.json(
        { message: 'You do not have permission to edit this lead' },
        { status: 403 },
      );
    }


    updateData.updated_by = user.id;
    updateData.updated_at = new Date().toISOString();

    // Update lead
    const { data: lead, error } = await supabase
      .from('crm_leads')
      .update(updateData)
      .eq('id', leadId)
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
      console.error('Update lead error:', error);
      throw error;
    }

    return NextResponse.json(
      {
        message: 'Lead updated successfully',
        data: lead,
      },
      { status: 200 },
    );
  },
);

/**
 * DELETE /api/leads/[leadId]
 * Soft delete a lead
 */
const deleteLead = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const leadId = params?.id;

    if (!leadId) {
      return NextResponse.json(
        { message: 'leadId is required' },
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

    // Check permissions
    // Get the lead to check permissions
    const { data: existingLead } = await supabase
      .from('crm_leads')
      .select('workspace_id, owner_id, created_by')
      .eq('id', leadId)
      .single();

    if (!existingLead) {
      return NextResponse.json({ message: 'Lead not found' }, { status: 404 });
    }

    // Get workspace to check if user is owner
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', existingLead.workspace_id)
      .single();

    const isWorkspaceOwner = workspace?.owner_id === user.id;
    const isOwner = existingLead.owner_id === user.id;
    let hasPermission = isWorkspaceOwner || isOwner;

    // If not owner, check RBAC permissions
    if (!hasPermission) {
      const { data: member } = await supabase
        .from('workspace_members')
        .select('role_id')
        .eq('user_id', user.id)
        .eq('workspace_id', existingLead.workspace_id)
        .single();

      if (member?.role_id) {
        const { data: permission } = await supabase
          .from('role_permissions')
          .select(
            `
            can_access,
            crm_module_features!inner (
              feature_key,
              crm_modules!inner (
                module_key
              )
            )
          `,
          )
          .eq('role_id', member.role_id)
          .eq('crm_module_features.feature_key', 'delete')
          .eq('crm_module_features.crm_modules.module_key', 'leads')
          .single();

        if (permission?.can_access) {
          hasPermission = true;
        }
      }
    }

    if (!hasPermission) {
      return NextResponse.json(
        { message: 'You do not have permission to delete this lead' },
        { status: 403 },
      );
    }

    // Soft delete lead
    const { data: lead, error } = await supabase
      .from('crm_leads')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq('id', leadId)
      .select()
      .single();

    if (error) {
      console.error('Delete lead error:', error);
      throw error;
    }

    return NextResponse.json(
      {
        message: 'Lead deleted successfully',
        data: lead,
      },
      { status: 200 },
    );
  },
);

export { getLeadById, updateLead, deleteLead };
