import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import type { Database } from '~/lib/database.types';
import { createEntitlementService } from '~/lib/entitlements';

import {
  filterLeadForRead,
  loadFieldPermissionContext,
  validateLeadWritePayload,
} from '../../../lib/field-permission';
import { catchAsync } from '../../../utils/response-handler';

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

    const fieldCtx = await loadFieldPermissionContext(supabase, {
      workspaceId: workspace_id,
      entityType: 'leads',
      productKey: 'sales',
      userId: user.id,
      moduleKey: 'leads',
    });

    const { sanitized, rejected } = validateLeadWritePayload(
      {
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
      },
      fieldCtx,
    );

    if (rejected.length > 0) {
      return NextResponse.json(
        {
          message: 'You do not have permission to set some fields',
          rejectedFields: rejected,
        },
        { status: 403 },
      );
    }

    if (!sanitized.first_name || !sanitized.status_id) {
      return NextResponse.json(
        { message: 'first_name and status_id are required' },
        { status: 400 },
      );
    }

    const entitlements = createEntitlementService();
    const lead = await entitlements.withUsageReservation(
      {
        workspaceId: workspace_id,
        moduleKey: 'sales',
        featureKey: 'sales.leads',
        resourceType: 'lead',
      },
      async () => {
        const { data, error } = await supabase
          .from('crm_leads')
          .insert({
            workspace_id,
            first_name: sanitized.first_name as string,
            last_name: (sanitized.last_name as string) || null,
            email: (sanitized.email as string) || null,
            alt_email: (sanitized.alt_email as string) || null,
            phone_number: (sanitized.phone_number as string) || null,
            mobile_number: (sanitized.mobile_number as string) || null,
            linkedin_url: (sanitized.linkedin_url as string) || null,
            company_name: (sanitized.company_name as string) || null,
            company_website: (sanitized.company_website as string) || null,
            company_linkedin_url:
              (sanitized.company_linkedin_url as string) || null,
            job_title: (sanitized.job_title as string) || null,
            department: (sanitized.department as string) || null,
            industry_id: (sanitized.industry_id as string) || null,
            company_size:
              (sanitized.company_size as Database['public']['Tables']['crm_leads']['Insert']['company_size']) ||
              null,
            annual_revenue: (sanitized.annual_revenue as number) || null,
            location: (sanitized.location as string) || null,
            timezone: (sanitized.timezone as string) || null,
            status_id: sanitized.status_id as string,
            source_id: (sanitized.source_id as string) || null,
            trigger: (sanitized.trigger as string) || null,
            lead_score: (sanitized.lead_score as number) || 0,
            owner_id: (sanitized.owner_id as string) || null,
            notes: (sanitized.notes as string) || null,
            tags: (sanitized.tags as string[]) || [],
            custom_fields: ((sanitized.custom_fields as Record<
              string,
              unknown
            >) ||
              {}) as Database['public']['Tables']['crm_leads']['Insert']['custom_fields'],
            created_by: user.id,
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
        return data;
      },
      (created) => ({ resourceId: created.id }),
    );

    return NextResponse.json(
      {
        message: 'Lead created successfully',
        data: filterLeadForRead(lead, fieldCtx),
      },
      { status: 201 },
    );
  },
);

/**
 * GET /api/leads/meta/sources
 * Fetch all lead sources for a workspace
 */

export { createLead };
