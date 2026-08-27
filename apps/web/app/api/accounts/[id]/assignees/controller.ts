import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { Database } from '@kit/supabase/database';
import ASSIGNMENT_NOTIFICATION_EMAIL_TEMPLATE from '~/constants/email.templates/assignment-notification.template';
import { NotificationService } from '~/lib/cron/notification-service';
import { transporter } from '~/utils/send-mail';
import { catchAsync, successDataResponse } from '~/utils/response-handler';

type AccountAssignee = Database['public']['Tables']['account_assignees']['Row'];

/**
 * GET /api/accounts/[id]/assignees
 * Get all assignees for an account
 */
const getAccountAssignees = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const accountId = params?.id;

    if (!accountId) {
      return NextResponse.json(
        { message: 'Account ID is required' },
        { status: 400 },
      );
    }

    const { data: assignees, error } = await (supabase
      .from('account_assignees_with_details' as any)
      .select('*')
      .eq('account_id', accountId)
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
 * POST /api/accounts/[id]/assignees
 * Assign a user to an account
 */
const assignAccountToUser = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const accountId = params?.id;
    const body = await request.json();
    const { assigned_to_user_id } = body;

    if (!accountId) {
      return NextResponse.json(
        { message: 'Account ID is required' },
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

    // Get the account to verify it exists and get workspace_id & details
    const { data: account, error: accountError } = await (adminClient
      .from('crm_accounts' as any)
      .select('id, workspace_id, account_name, website')
      .eq('id', accountId)
      .eq('is_deleted', false)
      .maybeSingle() as any);

    if (accountError) {
      console.error('Account lookup error:', accountError);
      throw accountError;
    }

    if (!account) {
      return NextResponse.json({ message: 'Account not found' }, { status: 404 });
    }

    // Check if an active assignment already exists
    const { data: existingActive } = await (adminClient
      .from('account_assignees' as any)
      .select('id')
      .eq('account_id', accountId)
      .eq('assigned_to_user_id', assigned_to_user_id)
      .eq('assignment_status', 'active')
      .maybeSingle() as any);

    if (existingActive) {
      return NextResponse.json(
        { message: 'User is already assigned to this account' },
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
      .from('account_assignees' as any)
      .select('id')
      .eq('account_id', accountId)
      .eq('assigned_to_user_id', assigned_to_user_id)
      .eq('assignment_status', 'inactive')
      .maybeSingle() as any);

    let assigneeId: string;

    if (existingInactive) {
      // Reactivate the existing row
      const { data: reactivated, error: reactivateError } = await (adminClient
        .from('account_assignees' as any)
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
      // Insert new assignment
      const { data: assignee, error: insertError } = await (adminClient
        .from('account_assignees' as any)
        .insert({
          account_id: accountId,
          assigned_to_user_id,
          workspace_id: account.workspace_id,
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
        const accountName = account.account_name || 'Account';
        const appBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const accountUrl = `${appBaseUrl}/home/sales/accounts/${accountId}`;

        const emailHtml = ASSIGNMENT_NOTIFICATION_EMAIL_TEMPLATE({
          entityType: 'Account',
          entityName: accountName,
          assignerName,
          entityUrl: accountUrl,
          details: [
            { label: 'Website', value: account.website },
          ],
          productName: 'Leadgaze',
          appUrl: appBaseUrl,
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@leadgaze.com',
          to: recipientEmail,
          subject: `You have been assigned an Account - Leadgaze`,
          html: emailHtml,
        });

        console.log('[AccountAssigneeNotification] Non-blocking email sent successfully to:', recipientEmail);
      } catch (notificationError) {
        console.error('[AccountAssigneeNotification] Non-blocking email dispatch error:', notificationError);
      }
    })();

    // Return with full details
    const { data: fullAssignee } = await (adminClient
      .from('account_assignees_with_details' as any)
      .select('*')
      .eq('id', assigneeId)
      .single() as any);

    return NextResponse.json(
      {
        message: 'User assigned to account successfully',
        data: fullAssignee,
      },
      { status: 201 },
    );
  },
);

/**
 * DELETE /api/accounts/[id]/assignees/[assigneeId]
 * Unassign a user from an account
 */
const unassignAccountFromUser = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const { id: accountId, assigneeId } = params || {};

    if (!accountId || !assigneeId) {
      return NextResponse.json(
        { message: 'Account ID and Assignee ID are required' },
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

    // Hard delete the assignment row to avoid UNIQUE(account_id, assigned_to_user_id, assignment_status) conflicts
    const adminClient = getSupabaseServerAdminClient();

    const { error: deleteError } = await (adminClient
      .from('account_assignees' as any)
      .delete()
      .eq('id', assigneeId)
      .eq('account_id', accountId) as any);

    if (deleteError) {
      console.error('Unassign user error:', deleteError);
      throw deleteError;
    }

    return successDataResponse('User unassigned from account successfully');
  },
);

export { getAccountAssignees, assignAccountToUser, unassignAccountFromUser };
