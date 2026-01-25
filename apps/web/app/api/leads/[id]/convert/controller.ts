import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { catchAsync } from '~/utils/response-handler';

/**
 * POST /api/leads/[leadId]/convert
 * Convert a lead to Account, Contact, and Opportunity
 */
export const convertLead = catchAsync(
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
    const {
      account,
      contact,
      opportunity,
      converted_status_id,
      should_create_opportunity,
    } = body;

    // 1. Auth Check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get Lead to verify existence and get workspace_id
    const { data: lead, error: leadError } = await supabase
      .from('crm_leads')
      .select('*')
      .eq('id', leadId)
      .eq('is_deleted', false)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ message: 'Lead not found' }, { status: 404 });
    }

    // Lookup industry_id if lead has industry
    let industryId = null;
    if (lead.industry) {
      const { data: industry } = await (supabase
        .from('crm_industries' as any)
        .select('id')
        .ilike('industry_name', lead.industry)
        .maybeSingle() as any);

      if (industry) {
        industryId = industry.id;
      }
    }

    const workspaceId = lead.workspace_id;
    let accountId = account.id;
    let contactId = contact.id;
    let opportunityId = null;

    // 3. Handle Account (Create or Use Existing)
    if (account.type === 'new') {
      const { data: newAccount, error: accError } = await supabase
        .from('crm_accounts')
        .insert({
          workspace_id: workspaceId,
          account_name: account.name,
          phone_number: lead.phone_number,
          website: lead.company_website,
          industry_id: industryId,
          status_id: account.status_id, // Default status needed or passed from FE
          owner_id: user.id, // Assign to current user or lead owner
          created_by: user.id,
          created_from_lead_id: leadId,
        })
        .select('id')
        .single();

      if (accError) {
        throw new Error(`Failed to create account: ${accError.message}`);
      }
      accountId = newAccount.id;
    }

    if (!accountId) {
      throw new Error('Account ID is missing');
    }

    // 4. Handle Contact (Create or Use Existing)
    if (contact.type === 'new') {
      const { data: newContact, error: contError } = await supabase
        .from('crm_contacts')
        .insert({
          workspace_id: workspaceId,
          first_name: contact.first_name || lead.first_name,
          last_name: contact.last_name || lead.last_name,
          email: contact.email || lead.email,
          phone_number: contact.phone || lead.phone_number,
          job_title: lead.job_title,
          account_id: accountId,
          status_id: contact.status_id,
          owner_id: user.id,
          created_by: user.id,
          created_from_lead_id: leadId,
          alt_email: lead.alt_email,
          mobile_number: lead.mobile_number,
        })
        .select('id')
        .single();

      if (contError) {
        throw new Error(`Failed to create contact: ${contError.message}`);
      }
      contactId = newContact.id;
    }

    // 5. Handle Opportunity (Optional)
    if (should_create_opportunity && opportunity) {
      if (opportunity.type === 'new') {
        const { data: newOpp, error: oppError } = await supabase
          .from('crm_opportunities')
          .insert({
            workspace_id: workspaceId,
            opportunity_name: opportunity.name,
            account_id: accountId,
            primary_contact_id: contactId,
            stage_id: opportunity.stage_id,
            amount: opportunity.amount || 0,
            expected_close_date: opportunity.close_date,
            owner_id: user.id,
            created_by: user.id,
            created_from_lead_id: leadId,
          })
          .select('id')
          .single();

        if (oppError) {
          throw new Error(`Failed to create opportunity: ${oppError.message}`);
        }
        opportunityId = newOpp.id;
      } else {
        opportunityId = opportunity.id;
      }
    }

    // 6. Update Lead (Mark as Converted)
    const { error: updateError } = await supabase
      .from('crm_leads')
      .update({
        status_id: converted_status_id,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('id', leadId);

    if (updateError) {
      throw new Error(`Failed to update lead: ${updateError.message}`);
    }

    return NextResponse.json(
      {
        message: 'Lead converted successfully',
        data: {
          accountId,
          contactId,
          opportunityId,
        },
      },
      { status: 200 },
    );
  },
);
