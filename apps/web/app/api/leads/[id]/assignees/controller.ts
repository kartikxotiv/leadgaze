import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { Database } from '@kit/supabase/database';
import ASSIGNMENT_NOTIFICATION_EMAIL_TEMPLATE from '~/constants/email.templates/assignment-notification.template';
import { NotificationService } from '~/lib/cron/notification-service';
import { transporter } from '~/utils/send-mail';
import { catchAsync, successDataResponse } from '~/utils/response-handler';

type LeadAssignee = Database['public']['Tables']['lead_assignees']['Row'];

/**
 * GET /api/leads/[id]/assignees
 * Get all assignees for a lead
 */
const getLeadAssignees = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const adminClient = getSupabaseServerAdminClient();
    const leadId = params?.id;

    if (!leadId) {
      return NextResponse.json(
        { message: 'Lead ID is required' },
        { status: 400 },
      );
    }

    const { data: assignees, error } = await adminClient
      .from('lead_assignees_with_details')
      .select('*')
      .eq('lead_id', leadId)
      .eq('assignment_status', 'active')
      .order('assigned_at', { ascending: true });

    if (error) {
      console.error('Get assignees error:', error);
      throw error;
    }

    return successDataResponse(
      'Assignees retrieved successfully',
      assignees || [],
    );
  },
);

/**
 * POST /api/leads/[id]/assignees
 * Assign a user to a lead
 */
const assignLeadToUser = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const leadId = params?.id;
    const body = await request.json();
    const { assigned_to_user_id } = body;

    if (!leadId) {
      return NextResponse.json(
        { message: 'Lead ID is required' },
        { status: 400 },
      );
    }

    if (!assigned_to_user_id) {
      return NextResponse.json(
        { message: 'assigned_to_user_id is required' },
        { status: 400 },
      );
    }

    const adminClient = getSupabaseServerAdminClient();

    // Get the lead using adminClient to verify it exists and get workspace_id and lead details
    const { data: lead, error: leadError } = await adminClient
      .from('crm_leads')
      .select('id, workspace_id, first_name, last_name, company_name, email')
      .eq('id', leadId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (leadError) {
      console.error('Lead lookup error:', leadError);
      throw leadError;
    }

    if (!lead) {
      return NextResponse.json({ message: 'Lead not found' }, { status: 404 });
    }

    // Check if an active assignment already exists
    const { data: existingActive } = await adminClient
      .from('lead_assignees')
      .select('id')
      .eq('lead_id', leadId)
      .eq('assigned_to_user_id', assigned_to_user_id)
      .eq('assignment_status', 'active')
      .maybeSingle();

    if (existingActive) {
      return NextResponse.json(
        { message: 'User is already assigned to this lead' },
        { status: 409 },
      );
    }

    // Get current user for audit trail
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Check if an inactive assignment exists - reactivate it instead of inserting
    const { data: existingInactive } = await adminClient
      .from('lead_assignees')
      .select('id')
      .eq('lead_id', leadId)
      .eq('assigned_to_user_id', assigned_to_user_id)
      .eq('assignment_status', 'inactive')
      .maybeSingle();

    let assigneeId: string;

    if (existingInactive) {
      // Reactivate the existing row
      const { data: reactivated, error: reactivateError } = await adminClient
        .from('lead_assignees')
        .update({
          assignment_status: 'active',
          assigned_at: new Date().toISOString(),
          assigned_by: user.id,
          unassigned_at: null,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingInactive.id)
        .select()
        .single();

      if (reactivateError) {
        console.error('Reactivate assignment error:', reactivateError);
        throw reactivateError;
      }
      assigneeId = reactivated.id;
    } else {
      // Insert new assignment
      const { data: assignee, error: insertError } = await adminClient
        .from('lead_assignees')
        .insert({
          lead_id: leadId,
          assigned_to_user_id,
          workspace_id: lead.workspace_id,
          assigned_by: user.id,
          created_by: user.id,
          assignment_status: 'active',
          assigned_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('Assign user error:', insertError);
        throw insertError;
      }
      assigneeId = assignee.id;
    }

    // AWAT void non-blocking email dispatch (no DB persistence / subscription tables written)
    void (async () => {
      try {
        const recipientEmail = await NotificationService.getUserEmail(assigned_to_user_id);
        if (!recipientEmail) return;

        const { data: assignerAccount } = await adminClient
          .from('accounts')
          .select('name')
          .eq('id', user.id)
          .maybeSingle();

        const assignerName = assignerAccount?.name || 'A team member';
        const leadName =
          [lead.first_name, lead.last_name].filter(Boolean).join(' ') ||
          'Lead';
        const appBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const leadUrl = `${appBaseUrl}/home/sales/leads/${leadId}`;

        const emailHtml = ASSIGNMENT_NOTIFICATION_EMAIL_TEMPLATE({
          entityType: 'Lead',
          entityName: leadName,
          assignerName,
          entityUrl: leadUrl,
          details: [
            { label: 'Company', value: lead.company_name },
            { label: 'Email', value: lead.email },
          ],
          productName: 'Leadgaze',
          appUrl: appBaseUrl,
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@leadgaze.com',
          to: recipientEmail,
          subject: `You have been assigned a Lead - Leadgaze`,
          html: emailHtml,
        });

        console.log('[LeadAssigneeNotification] Non-blocking email sent successfully to:', recipientEmail);
      } catch (notificationError) {
        console.error('[LeadAssigneeNotification] Non-blocking email dispatch error:', notificationError);
      }
    })();

    // Return with full details
    const { data: fullAssignee } = await adminClient
      .from('lead_assignees_with_details')
      .select('*')
      .eq('id', assigneeId)
      .single();

    return NextResponse.json(
      {
        message: 'User assigned to lead successfully',
        data: fullAssignee,
      },
      { status: 201 },
    );
  },
);

/**
 * DELETE /api/leads/[id]/assignees/[assigneeId]
 * Unassign a user from a lead
 */
const unassignLeadFromUser = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const { id: leadId, assigneeId } = params || {};

    if (!leadId || !assigneeId) {
      return NextResponse.json(
        { message: 'Lead ID and Assignee ID are required' },
        { status: 400 },
      );
    }

    // Get current user for audit trail
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Hard delete the assignment row to avoid UNIQUE constraint conflicts
    const adminClient = getSupabaseServerAdminClient();

    const { error: deleteError } = await adminClient
      .from('lead_assignees')
      .delete()
      .eq('id', assigneeId)
      .eq('lead_id', leadId);

    if (deleteError) {
      console.error('Unassign user error:', deleteError);
      throw deleteError;
    }

    return successDataResponse('User unassigned from lead successfully');
  },
);

export { getLeadAssignees, assignLeadToUser, unassignLeadFromUser };
