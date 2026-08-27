import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { Database } from '@kit/supabase/database';
import ASSIGNMENT_NOTIFICATION_EMAIL_TEMPLATE from '~/constants/email.templates/assignment-notification.template';
import { NotificationService } from '~/lib/cron/notification-service';
import { transporter } from '~/utils/send-mail';
import { catchAsync, successDataResponse } from '~/utils/response-handler';

type ContactAssignee = Database['public']['Tables']['contact_assignees']['Row'];

/**
 * GET /api/contacts/[id]/assignees
 * Get all assignees for a contact
 */
const getContactAssignees = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const contactId = params?.id;

    if (!contactId) {
      return NextResponse.json(
        { message: 'Contact ID is required' },
        { status: 400 },
      );
    }

    const { data: assignees, error } = await (supabase
      .from('contact_assignees_with_details' as any)
      .select('*')
      .eq('contact_id', contactId)
      .eq('assignment_status', 'active')
      .order('assigned_at', { ascending: true }) as any);

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
 * POST /api/contacts/[id]/assignees
 * Assign a user to a contact
 */
const assignContactToUser = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const contactId = params?.id;
    const body = await request.json();
    const { assigned_to_user_id } = body;

    if (!contactId) {
      return NextResponse.json(
        { message: 'Contact ID is required' },
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

    // Get the contact to verify it exists and get workspace_id & details
    const { data: contact, error: contactError } = await (adminClient
      .from('crm_contacts' as any)
      .select('id, workspace_id, first_name, last_name, email, phone_number, account:crm_accounts(account_name)')
      .eq('id', contactId)
      .eq('is_deleted', false)
      .maybeSingle() as any);

    if (contactError) {
      console.error('Contact lookup error:', contactError);
      throw contactError;
    }

    if (!contact) {
      return NextResponse.json({ message: 'Contact not found' }, { status: 404 });
    }

    // Check if an active assignment already exists
    const { data: existingActive } = await (adminClient
      .from('contact_assignees' as any)
      .select('id')
      .eq('contact_id', contactId)
      .eq('assigned_to_user_id', assigned_to_user_id)
      .eq('assignment_status', 'active')
      .maybeSingle() as any);

    if (existingActive) {
      return NextResponse.json(
        { message: 'User is already assigned to this contact' },
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
    const { data: existingInactive } = await (adminClient
      .from('contact_assignees' as any)
      .select('id')
      .eq('contact_id', contactId)
      .eq('assigned_to_user_id', assigned_to_user_id)
      .eq('assignment_status', 'inactive')
      .maybeSingle() as any);

    let assigneeId: string;

    if (existingInactive) {
      const { data: reactivated, error: reactivateError } = await (adminClient
        .from('contact_assignees' as any)
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
        .single() as any);

      if (reactivateError) {
        console.error('Reactivate assignment error:', reactivateError);
        throw reactivateError;
      }
      assigneeId = reactivated.id;
    } else {
      const { data: assignee, error: insertError } = await (adminClient
        .from('contact_assignees' as any)
        .insert({
          contact_id: contactId,
          assigned_to_user_id,
          workspace_id: contact.workspace_id,
          assigned_by: user.id,
          created_by: user.id,
          assignment_status: 'active',
          assigned_at: new Date().toISOString(),
        })
        .select()
        .single() as any);

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

        const { data: assignerAccount } = await (adminClient
          .from('accounts' as any)
          .select('name')
          .eq('id', user.id)
          .maybeSingle() as any);

        const assignerName = assignerAccount?.name || 'A team member';
        const contactName =
          [contact.first_name, contact.last_name].filter(Boolean).join(' ') ||
          'Contact';
        const companyName = contact.account?.account_name || null;
        const appBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const contactUrl = `${appBaseUrl}/home/sales/contacts/${contactId}`;

        const emailHtml = ASSIGNMENT_NOTIFICATION_EMAIL_TEMPLATE({
          entityType: 'Contact',
          entityName: contactName,
          assignerName,
          entityUrl: contactUrl,
          details: [
            { label: 'Company', value: companyName },
            { label: 'Email', value: contact.email },
            { label: 'Phone', value: contact.phone_number },
          ],
          productName: 'Leadgaze',
          appUrl: appBaseUrl,
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@leadgaze.com',
          to: recipientEmail,
          subject: `Contact Assigned to You - Leadgaze`,
          html: emailHtml,
        });

        console.log('[ContactAssigneeNotification] Non-blocking email sent successfully to:', recipientEmail);
      } catch (notificationError) {
        console.error('[ContactAssigneeNotification] Non-blocking email dispatch error:', notificationError);
      }
    })();

    // Return with full details
    const { data: fullAssignee } = await (adminClient
      .from('contact_assignees_with_details' as any)
      .select('*')
      .eq('id', assigneeId)
      .single() as any);

    return NextResponse.json(
      {
        message: 'User assigned to contact successfully',
        data: fullAssignee,
      },
      { status: 201 },
    );
  },
);

/**
 * DELETE /api/contacts/[id]/assignees/[assigneeId]
 * Unassign a user from a contact
 */
const unassignContactFromUser = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const { id: contactId, assigneeId } = params || {};

    if (!contactId || !assigneeId) {
      return NextResponse.json(
        { message: 'Contact ID and Assignee ID are required' },
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

    const { error: deleteError } = await (adminClient
      .from('contact_assignees' as any)
      .delete()
      .eq('id', assigneeId)
      .eq('contact_id', contactId) as any);

    if (deleteError) {
      console.error('Unassign user error:', deleteError);
      throw deleteError;
    }

    return successDataResponse('User unassigned from contact successfully');
  },
);

export { getContactAssignees, assignContactToUser, unassignContactFromUser };
