import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { Database } from '@kit/supabase/database';
import {
  filterLeadForRead,
  loadFieldPermissionContext,
  validateLeadWritePayload,
} from '~/lib/field-permission';
import { catchAsync, successDataResponse } from '~/utils/response-handler';

type Lead = Database['public']['Tables']['crm_leads']['Row'];

type LeadWithRelations = Lead & {
  converted_account_id?: string | null;
  is_converted_to_account?: boolean;
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
    request: _request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const adminClient = getSupabaseServerAdminClient<Database>();
    const leadId = params?.id;

    if (!leadId) {
      return NextResponse.json(
        { message: 'leadId is required' },
        { status: 400 },
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the lead first to get workspace_id for the RPC access check
    const { data: leadStub, error } = await adminClient
      .from('crm_leads')
      .select('workspace_id, owner_id, created_by')
      .eq('id', leadId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error) {
      console.error('Get lead error:', error);
      throw error;
    }

    if (!leadStub) {
      return NextResponse.json({ message: 'Lead not found' }, { status: 404 });
    }

    // Single RPC call replaces: accounts lookup, workspace owner check, membership check
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { data: accessResult, error: accessError } = await (
      adminClient as any
    ).rpc('resolve_workspace_access', {
      p_workspace_id: leadStub.workspace_id,
      p_user_id: user.id,
      p_user_email: user.email || null,
      p_require_shared_team: false,
    });
    /* eslint-enable @typescript-eslint/no-explicit-any */

    if (accessError) {
      console.error('Workspace access resolution error:', accessError);
      throw accessError;
    }

    const {
      is_owner: isOwner,
      is_member: isMember,
      hierarchy_type: hierarchyType,
      visible_user_ids: rpcVisibleUserIds,
    } = accessResult;

    if (!isOwner && !isMember) {
      return NextResponse.json(
        { message: 'Forbidden: You are not a member of this workspace' },
        { status: 403 },
      );
    }

    const { LeadsService } = await import('@kit/sales');
    const leadsService = new LeadsService(adminClient);

    const { lead: rawLead, relations } = await leadsService.getLeadDetails({
      leadId,
      workspaceId: leadStub.workspace_id,
      isOwner,
      visibleUserIds: rpcVisibleUserIds || []
    });

    if (!rawLead) {
      return NextResponse.json({ message: 'Lead not found' }, { status: 404 });
    }

    const leadWithConversion = {
      ...rawLead,
      converted_account_id: relations.accounts?.[0]?.id || null,
      is_converted_to_account: Boolean(relations.accounts?.length),
    } as LeadWithRelations;

    const fieldCtx = await loadFieldPermissionContext(supabase, {
      workspaceId: leadStub.workspace_id,
      entityType: 'leads',
      productKey: 'sales',
      userId: user.id,
      moduleKey: 'leads',
    });

    return successDataResponse(
      'Lead retrieved successfully',
      filterLeadForRead(leadWithConversion, fieldCtx),
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

    // Get the lead to check permissions
    const { data: existingLead } = await supabase
      .from('crm_leads')
      .select('workspace_id, owner_id, created_by')
      .eq('id', leadId)
      .single();

    if (!existingLead) {
      return NextResponse.json({ message: 'Lead not found' }, { status: 404 });
    }

    const fieldCtx = await loadFieldPermissionContext(supabase, {
      workspaceId: existingLead.workspace_id,
      entityType: 'leads',
      productKey: 'sales',
      userId: user.id,
      moduleKey: 'leads',
    });

    const { sanitized, rejected } = validateLeadWritePayload(body, fieldCtx);

    if (rejected.length > 0) {
      return NextResponse.json(
        {
          message: 'You do not have permission to update some fields',
          rejectedFields: rejected,
        },
        { status: 403 },
      );
    }

    // Update lead - support partial updates from sanitized payload
    const updateData: Database['public']['Tables']['crm_leads']['Update'] = {};

    if (sanitized.first_name !== undefined) updateData.first_name = sanitized.first_name as string;
    if (sanitized.last_name !== undefined)
      updateData.last_name = (sanitized.last_name as string) || null;
    if (sanitized.email !== undefined) updateData.email = (sanitized.email as string) || null;
    if (sanitized.alt_email !== undefined)
      updateData.alt_email = (sanitized.alt_email as string) || null;
    if (sanitized.phone_number !== undefined)
      updateData.phone_number = (sanitized.phone_number as string) || null;
    if (sanitized.mobile_number !== undefined)
      updateData.mobile_number = (sanitized.mobile_number as string) || null;
    if (sanitized.linkedin_url !== undefined)
      updateData.linkedin_url = (sanitized.linkedin_url as string) || null;
    if (sanitized.company_name !== undefined)
      updateData.company_name = (sanitized.company_name as string) || null;
    if (sanitized.company_website !== undefined)
      updateData.company_website = (sanitized.company_website as string) || null;
    if (sanitized.company_linkedin_url !== undefined)
      updateData.company_linkedin_url = (sanitized.company_linkedin_url as string) || null;
    if (sanitized.job_title !== undefined)
      updateData.job_title = (sanitized.job_title as string) || null;
    if (sanitized.department !== undefined)
      updateData.department = (sanitized.department as string) || null;
    if (sanitized.industry_id !== undefined)
      updateData.industry_id = (sanitized.industry_id as string) || null;
    if (sanitized.company_size !== undefined)
      updateData.company_size = (sanitized.company_size as Database['public']['Tables']['crm_leads']['Update']['company_size']) || null;
    if (sanitized.annual_revenue !== undefined)
      updateData.annual_revenue = (sanitized.annual_revenue as number) || null;
    if (sanitized.location !== undefined)
      updateData.location = (sanitized.location as string) || null;
    if (sanitized.timezone !== undefined)
      updateData.timezone = (sanitized.timezone as string) || null;
    if (sanitized.status_id !== undefined) updateData.status_id = sanitized.status_id as string;
    if (sanitized.source_id !== undefined)
      updateData.source_id = (sanitized.source_id as string) || null;
    if (sanitized.trigger !== undefined) updateData.trigger = (sanitized.trigger as string) || null;
    if (sanitized.lead_score !== undefined) updateData.lead_score = sanitized.lead_score as number;
    if (sanitized.owner_id !== undefined)
      updateData.owner_id = (sanitized.owner_id as string) || null;
    if (sanitized.notes !== undefined) updateData.notes = (sanitized.notes as string) || null;
    if (sanitized.tags !== undefined) updateData.tags = sanitized.tags as string[];
    if (sanitized.custom_fields !== undefined) {
      const { data: currentLead } = await supabase
        .from('crm_leads')
        .select('custom_fields')
        .eq('id', leadId)
        .single();
      const existingCustom =
        (currentLead?.custom_fields as Record<string, unknown>) ?? {};
      updateData.custom_fields = {
        ...existingCustom,
        ...(sanitized.custom_fields as Record<string, unknown>),
      } as Database['public']['Tables']['crm_leads']['Update']['custom_fields'];
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { message: 'No valid fields to update' },
        { status: 400 },
      );
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
      const { data: members } = await supabase
        .from('workspace_members')
        .select('role_id, product_key')
        .eq('user_id', user.id)
        .eq('workspace_id', existingLead.workspace_id);

      const member = members?.find((m: any) => m.product_key === 'sales')
        || members?.find((m: any) => m.product_key === null)
        || members?.[0];

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
        updated_by_account:accounts!crm_leads_updated_by_fkey(id, email, name),
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
        data: filterLeadForRead(lead, fieldCtx),
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
    request: _request,
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
      const { data: members } = await supabase
        .from('workspace_members')
        .select('role_id, product_key')
        .eq('user_id', user.id)
        .eq('workspace_id', existingLead.workspace_id);

      const member = members?.find((m: any) => m.product_key === 'sales')
        || members?.find((m: any) => m.product_key === null)
        || members?.[0];

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
