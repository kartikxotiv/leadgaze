import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import type { Database } from '~/lib/database.types';
import {
  filterLeadForRead,
  loadFieldPermissionContext,
  validateLeadWritePayload,
} from '~/lib/field-permission';
import { catchAsync } from '~/utils/response-handler';

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
      .eq('is_deleted', false)
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

    if (sanitized.first_name !== undefined)
      updateData.first_name = sanitized.first_name as string;
    if (sanitized.last_name !== undefined)
      updateData.last_name = (sanitized.last_name as string) || null;
    if (sanitized.email !== undefined)
      updateData.email = (sanitized.email as string) || null;
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
      updateData.company_website =
        (sanitized.company_website as string) || null;
    if (sanitized.company_linkedin_url !== undefined)
      updateData.company_linkedin_url =
        (sanitized.company_linkedin_url as string) || null;
    if (sanitized.job_title !== undefined)
      updateData.job_title = (sanitized.job_title as string) || null;
    if (sanitized.department !== undefined)
      updateData.department = (sanitized.department as string) || null;
    if (sanitized.industry_id !== undefined)
      updateData.industry_id = (sanitized.industry_id as string) || null;
    if (sanitized.company_size !== undefined)
      updateData.company_size =
        (sanitized.company_size as Database['public']['Tables']['crm_leads']['Update']['company_size']) ||
        null;
    if (sanitized.annual_revenue !== undefined)
      updateData.annual_revenue = (sanitized.annual_revenue as number) || null;
    if (sanitized.location !== undefined)
      updateData.location = (sanitized.location as string) || null;
    if (sanitized.timezone !== undefined)
      updateData.timezone = (sanitized.timezone as string) || null;
    if (sanitized.status_id !== undefined)
      updateData.status_id = sanitized.status_id as string;
    if (sanitized.source_id !== undefined)
      updateData.source_id = (sanitized.source_id as string) || null;
    if (sanitized.trigger !== undefined)
      updateData.trigger = (sanitized.trigger as string) || null;
    if (sanitized.lead_score !== undefined)
      updateData.lead_score = sanitized.lead_score as number;
    if (sanitized.owner_id !== undefined)
      updateData.owner_id = (sanitized.owner_id as string) || null;
    if (sanitized.notes !== undefined)
      updateData.notes = (sanitized.notes as string) || null;
    if (sanitized.tags !== undefined)
      updateData.tags = sanitized.tags as string[];
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

      const member =
        members?.find(
          (member: { product_key: string | null }) =>
            member.product_key === 'sales',
        ) ||
        members?.find(
          (member: { product_key: string | null }) =>
            member.product_key === null,
        ) ||
        members?.[0];

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

export { updateLead };
