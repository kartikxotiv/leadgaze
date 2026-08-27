import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { Database } from '@kit/supabase/database';
import LEAD_ASSIGNMENT_EMAIL_TEMPLATE from '~/constants/email.templates/lead-assignment.template';
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
    const supabase = getSupabaseServerClient();
    const leadId = params?.id;

    if (!leadId) {
      return NextResponse.json(
        { message: 'Lead ID is required' },
        { status: 400 },
      );
    }

    const { data: assignees, error } = await supabase
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

    // Safe notification & email dispatch (assignment DB operation is already committed)
    try {
      const recipientEmail = await NotificationService.getUserEmail(assigned_to_user_id);

      const { data: assignerAccount } = await adminClient
        .from('accounts')
        .select('name')
        .eq('id', user.id)
        .maybeSingle();

      const assignerName = assignerAccount?.name || 'A team member';
      const leadName =
        [lead.first_name, lead.last_name].filter(Boolean).join(' ') ||
        'Lead';

      // 1. Create In-App Notification
      const { error: inAppError } = await adminClient
        .from('subscription_notifications')
        .insert({
          workspace_id: lead.workspace_id,
          recipient_id: assigned_to_user_id,
          event_type: 'lead_assigned',
          event_key: `lead_assigned:${leadId}:${assigned_to_user_id}:${Date.now()}`,
          channel: 'in_app',
          title: 'Lead Assigned',
          message: `${leadName} has been assigned to you.`,
          action_url: `/home/sales/leads/${leadId}`,
          delivery_status: 'sent',
          delivered_at: new Date().toISOString(),
          metadata: {
            lead_id: leadId,
            lead_name: leadName,
            assigned_by: user.id,
            assigner_name: assignerName,
          },
        });

      if (inAppError) {
        console.error('[LeadAssigneeNotification] In-app notification error:', inAppError);
      } else {
        console.log('[LeadAssigneeNotification] In-app notification created successfully for recipient:', assigned_to_user_id);
      }

      // 2. Send Email Notification
      if (recipientEmail) {
        const appBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const leadUrl = `${appBaseUrl}/home/sales/leads/${leadId}`;
        const emailSubject = `You have been assigned a Lead - Leadgaze`;
        const emailHtml = LEAD_ASSIGNMENT_EMAIL_TEMPLATE({
          leadName,
          leadCompany: lead.company_name,
          leadEmail: lead.email,
          assignerName,
          leadUrl,
          productName: 'Leadgaze',
          appUrl: appBaseUrl,
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@leadgaze.com',
          to: recipientEmail,
          subject: emailSubject,
          html: emailHtml,
        });

        console.log('[LeadAssigneeNotification] Email notification sent successfully to:', recipientEmail);
      } else {
        console.warn('[LeadAssigneeNotification] Recipient email not found for user:', assigned_to_user_id);
      }
    } catch (notificationError) {
      console.error('[LeadAssigneeNotification] Error during notification/email dispatch:', notificationError);
    }

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
