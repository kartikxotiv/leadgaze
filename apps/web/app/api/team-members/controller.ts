import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import INVITE_MEMBER_TEMPLATE from '~/constants/email.templates/member-invite.template';
import { transporter } from '~/utils/send-mail';

import { Database } from '@kit/supabase/database';
import {
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';

// Extended type with user and role data
type WorkspaceMemberWithData = Omit<
  Database['public']['Tables']['workspace_members']['Row'],
  'role'
> & {
  user?: {
    id: string;
    email: string;
    user_metadata?: Record<string, any>;
  } | null;
  role?: {
    id: string;
    role_name: string;
    role_key: string;
    hierarchy_level: number;
    color: string | null;
  } | null;
};

const getMembers = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId');
    const productKey = url.searchParams.get('productKey');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
        { status: 400 },
      );
    }

    // Build query with optional product_key filter
    let query = supabase.from('workspace_members').select(
      `
        id,
        workspace_id,
        user_id,
        role_id,
        status,
        product_key,
        created_at,
        role:workspace_roles(id, role_name, role_key, hierarchy_level, color, product_key)
      `,
    );

    query = query.eq('workspace_id', workspaceId);
    
    // Filter out removed/deleted members, or filter by specific status
    if (status && status !== 'all') {
      query = query.eq('status', status);
    } else {
      query = query.neq('status', 'removed');
    }

    if (productKey) {
      query = query.eq('product_key', productKey);
    }

    query = query.order('created_at', { ascending: false });

    const { data: members, error } = await (query as any);

    if (error) {
      console.error('Get members error:', error);
      throw error;
    }

    let filteredMembers = members;

    // Filter members by active seat assignment for the specified product, if provided
    if (productKey) {
      const adminClient = getSupabaseServerAdminClient() as any;
      const { data: productRow } = await adminClient
        .from('subscription_products')
        .select('id')
        .eq('product_key', productKey)
        .maybeSingle();

      if (productRow) {
        const { data: activeAssignments } = await adminClient
          .from('seat_assignments')
          .select('user_id')
          .eq('workspace_id', workspaceId)
          .eq('product_id', productRow.id)
          .eq('is_active', true);

        const assignedUserIds = new Set(
          activeAssignments?.map((a: any) => a.user_id) || []
        );

        // Pending members are always shown so admins can manage invites
        filteredMembers = filteredMembers.filter(
          (m: any) => m.status === 'pending' || (m.user_id && assignedUserIds.has(m.user_id))
        );
      }
    }

    // Fetch account details for all members
    if (filteredMembers && filteredMembers.length > 0) {
      const userIds = filteredMembers.map((m: any) => m.user_id).filter(Boolean);
      if (userIds.length > 0) {
        const { data: accounts } = await supabase
          .from('accounts')
          .select('id, email, name, picture_url')
          .in('id', userIds);

        const accountMap = new Map(accounts?.map((a) => [a.id, a]) || []);

        // Map account data to members
        let membersWithUsers = filteredMembers.map((member: any) => ({
          ...member,
          user: accountMap.get(member.user_id)
            ? {
                id: accountMap.get(member.user_id)?.id,
                email: accountMap.get(member.user_id)?.email,
                user_metadata: {
                  full_name: accountMap.get(member.user_id)?.name,
                  avatar_url: accountMap.get(member.user_id)?.picture_url,
                },
              }
            : null,
        })) as WorkspaceMemberWithData[];

        if (search) {
          const term = search.toLowerCase();
          membersWithUsers = membersWithUsers.filter(
            (m) =>
              (m.user?.user_metadata?.full_name || '')
                .toLowerCase()
                .includes(term) ||
              (m.user?.email || '').toLowerCase().includes(term),
          );
        }

        return successDataResponse(
          'Members retrieved successfully',
          membersWithUsers,
        );
      }
    }

    let finalMembers = filteredMembers as WorkspaceMemberWithData[];
    
    // Fallback search if members didn't have user profiles (e.g. pending ones)
    // Though usually pending members are in the invitations table.
    if (search) {
      const term = search.toLowerCase();
      finalMembers = finalMembers.filter(
        (m) =>
          (m.user?.user_metadata?.full_name || '')
            .toLowerCase()
            .includes(term) ||
          (m.user?.email || '').toLowerCase().includes(term),
      );
    }

    return successDataResponse(
      'Members retrieved successfully',
      finalMembers,
    );
  },
);

const getMemberById = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const memberId = params?.memberId;

    if (!memberId) {
      return NextResponse.json(
        { message: 'memberId is required' },
        { status: 400 },
      );
    }

    const { data: member, error } = await (
      supabase.from('workspace_members').select(
        `
        *,
        role:workspace_roles(id, role_name, role_key, hierarchy_level, color)
      `,
      ) as any
    )
      .eq('id', memberId)
      .single();

    if (error) {
      console.error('Get member error:', error);
      throw error;
    }

    if (!member) {
      return NextResponse.json(
        { message: 'Member not found' },
        { status: 404 },
      );
    }

    // Fetch account details
    let memberWithUser: WorkspaceMemberWithData =
      member as WorkspaceMemberWithData;
    if (member.user_id) {
      const { data: account } = await supabase
        .from('accounts')
        .select('id, email, name, picture_url')
        .eq('id', member.user_id)
        .single();

      if (account) {
        memberWithUser = {
          ...member,
          user: {
            id: account.id,
            email: account.email,
            user_metadata: {
              full_name: account.name,
              avatar_url: account.picture_url,
            },
          },
        } as WorkspaceMemberWithData;
      }
    }

    return successDataResponse('Member retrieved successfully', memberWithUser);
  },
);

const inviteMember = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const adminClient = getSupabaseServerAdminClient();
    // const url = new URL(request.url);
    // const workspaceId = url.searchParams.get('workspaceId');
    const { email, role_id, workspaceId, productKey } = await request.json();

    if (!workspaceId || !email || !role_id) {
      return NextResponse.json(
        { message: 'workspaceId, email, and role_id are required' },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 },
      );
    }

    // ── Seat availability check ──────────────────────────────────
    // If a productKey is provided, verify there is at least one free seat
    // in that module before allowing the invitation.
    if (productKey) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: productRow } = await (adminClient as any)
        .from('subscription_products')
        .select('id')
        .eq('product_key', productKey)
        .maybeSingle();

      if (productRow) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: seatRow } = await (adminClient as any)
          .from('workspace_module_seats')
          .select('id, seats_purchased, seats_used, status')
          .eq('workspace_id', workspaceId)
          .eq('product_id', productRow.id)
          .in('status', ['active', 'trialing'])
          .maybeSingle();

        if (seatRow && seatRow.seats_used >= seatRow.seats_purchased) {
          return NextResponse.json(
            {
              message: `No seats available in this module. All ${seatRow.seats_purchased} seat(s) are already in use. Please increase your seat count from the subscription page before inviting new members.`,
            },
            { status: 403 },
          );
        }
      }
    }

    // Check if role exists and belongs to workspace
    const { data: role, error: roleError } = await supabase
      .from('workspace_roles')
      .select('id')
      .eq('id', role_id)
      .eq('workspace_id', workspaceId)
      .single();

    if (roleError || !role) {
      return NextResponse.json(
        { message: 'Role not found in workspace' },
        { status: 404 },
      );
    }

    // Check if invitation already exists for this email in workspace
    const { data: existingInvitation } = await supabase
      .from('workspace_invitations')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      return NextResponse.json(
        { message: 'An invitation has already been sent to this email' },
        { status: 409 },
      );
    }

    // Generate a unique invite token
    const generateToken = () => {
      return (
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15)
      );
    };

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    // Create invitation record in workspace_invitations table
    const { data: invitation, error: inviteError } = await supabase
      .from('workspace_invitations')
      .insert({
        workspace_id: workspaceId,
        email,
        role_id,
        status: 'pending',
        token,
        token_expires_at: expiresAt.toISOString(),
        // Store the module product key so seat assignment on accept
        // only targets the module the invite was sent from.
        ...(productKey ? { product_key: productKey } : {}),
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Create invitation error:', inviteError);
      throw inviteError;
    }

    // Fetch workspace details for email
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, name, company_id')
      .eq('id', workspaceId)
      .single();

    let billingCountry = 'US';
    if (workspace?.company_id) {
      const { data: company } = await supabase
        .from('companies')
        .select('billing_country')
        .eq('id', workspace.company_id)
        .single();
      if (company?.billing_country) {
        billingCountry = company.billing_country;
      }
    }

    // Send invitation email
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite?token=${token}`;
    const { data: { user } = {} } = await supabase.auth.getUser();
    let inviterName = user?.user_metadata?.email || 'Someone';
    if (user) {
      const { data: userData } = await supabase
        .from('accounts')
        .select('name')
        .eq('id', user?.id)
        .single();
      inviterName = userData?.name || inviterName;
    }

    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        replyTo: user?.email || process.env.SMTP_USER,
        subject: `${inviterName} invited you to join ${workspace?.name || 'Workspace'} on ${process.env.NEXT_PUBLIC_PRODUCT_NAME || 'Leadgaze'}`,
        html: INVITE_MEMBER_TEMPLATE({
          inviteLink: inviteUrl,
          workspaceName: workspace?.name || 'Workspace',
          inviterName,
          productName: process.env.NEXT_PUBLIC_PRODUCT_NAME || 'Leadgaze',
          appUrl: process.env.NEXT_PUBLIC_APP_URL,
          billingCountry,
        }),
      });
    } catch (error) {
      console.error('Email sending error:', error);
      // Still return success to prevent information leakage
    }

    return successDataResponse('Invitation sent successfully', invitation);
  },
);

const updateMember = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const memberId = params?.memberId;
    const { role_id, status, is_primary_contact } = await request.json();

    if (!memberId) {
      return NextResponse.json(
        { message: 'memberId is required' },
        { status: 400 },
      );
    }

    // Get current member with role details
    const { data: currentMember, error: fetchError } = await supabase
      .from('workspace_members')
      .select('*, role:workspace_roles(id, role_name, role_key, hierarchy_level)')
      .eq('id', memberId)
      .single();

    if (fetchError || !currentMember) {
      return NextResponse.json(
        { message: 'Member not found' },
        { status: 404 },
      );
    }

    // Authorization check: verify workspace owner is not modified by other team members
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, owner_id')
      .eq('id', currentMember.workspace_id)
      .single();

    const isTargetOwner =
      (workspace?.owner_id && currentMember.user_id === workspace.owner_id) ||
      currentMember.role?.role_key === 'owner' ||
      currentMember.is_primary_contact === true;

    const isRequestingOwner =
      currentUser.id === currentMember.user_id ||
      (workspace?.owner_id && currentUser.id === workspace.owner_id);

    if (isTargetOwner && !isRequestingOwner) {
      return NextResponse.json(
        { message: 'The workspace owner role cannot be modified by other team members' },
        { status: 403 },
      );
    }

    // If changing role, verify new role exists in same workspace
    if (role_id) {
      const { data: role, error: roleError } = await supabase
        .from('workspace_roles')
        .select('id, role_key, hierarchy_level')
        .eq('id', role_id)
        .eq('workspace_id', currentMember.workspace_id)
        .single();

      if (roleError || !role) {
        return NextResponse.json(
          { message: 'Role not found in workspace' },
          { status: 404 },
        );
      }
    }

    const updateData: any = {};
    if (role_id !== undefined) updateData.role_id = role_id;
    if (status !== undefined) updateData.status = status;
    if (is_primary_contact !== undefined)
      updateData.is_primary_contact = is_primary_contact;

    const { data: updatedMember, error } = await (
      supabase
        .from('workspace_members')
        .update(updateData)
        .eq('id', memberId)
        .select(
          `
        *,
        role:workspace_roles(id, role_name, role_key, hierarchy_level, color)
      `,
        ) as any
    ).single();

    if (error) {
      console.error('Update member error:', error);
      throw error;
    }

    // Fetch account details
    let memberWithUser: WorkspaceMemberWithData =
      updatedMember as WorkspaceMemberWithData;
    if (updatedMember.user_id) {
      const { data: account } = await supabase
        .from('accounts')
        .select('id, email, name, picture_url')
        .eq('id', updatedMember.user_id)
        .single();

      if (account) {
        memberWithUser = {
          ...updatedMember,
          user: {
            id: account.id,
            email: account.email,
            user_metadata: {
              full_name: account.name,
              avatar_url: account.picture_url,
            },
          },
        } as WorkspaceMemberWithData;
      }
    }

    return successDataResponse('Member updated successfully', memberWithUser);
  },
);

const removeMember = catchAsync(
  async ({
    request: _request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const memberId = params?.memberId;

    if (!memberId) {
      return NextResponse.json(
        { message: 'memberId is required' },
        { status: 400 },
      );
    }

    // Get current member with role details
    const { data: member, error: fetchError } = await supabase
      .from('workspace_members')
      .select('*, role:workspace_roles(id, role_name, role_key, hierarchy_level)')
      .eq('id', memberId)
      .single();

    if (fetchError || !member) {
      return NextResponse.json(
        { message: 'Member not found' },
        { status: 404 },
      );
    }

    // Authorization check: verify workspace owner is not removed by other team members
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, owner_id')
      .eq('id', member.workspace_id)
      .single();

    const isTargetOwner =
      (workspace?.owner_id && member.user_id === workspace.owner_id) ||
      member.role?.role_key === 'owner' ||
      member.is_primary_contact === true;

    const isRequestingOwner =
      currentUser.id === member.user_id ||
      (workspace?.owner_id && currentUser.id === workspace.owner_id);

    if (isTargetOwner && !isRequestingOwner) {
      return NextResponse.json(
        { message: 'The workspace owner cannot be removed by other team members' },
        { status: 403 },
      );
    }

    // ── Auto-revoke ALL seat assignments for this user in this workspace ──
    // When a member is removed, they lose access to all modules.
    await autoRevokeSeats(member.workspace_id, member.user_id);

    // Update status to 'removed' instead of deleting
    const { error } = await supabase
      .from('workspace_members')
      .update({ status: 'removed' })
      .eq('id', memberId);

    if (error) {
      console.error('Remove member error:', error);
      throw error;
    }

    return successDataResponse('Member removed successfully');
  },
);

// ─── Helper: Revoke ALL seat assignments for a removed member ──────────

async function autoRevokeSeats(workspaceId: string, userId: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminClient = getSupabaseServerAdminClient() as any;

    await adminClient
      .from('seat_assignments')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoked_by: userId,
      })
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('is_active', true);
  } catch (error) {
    console.error('Auto-revoke seats error:', error);
  }
}

const resendInvitation = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const url = new URL(request.url);
    const _workspaceId = url.searchParams.get('workspaceId');
    const memberId = params?.memberId;

    if (!memberId) {
      return NextResponse.json(
        { message: 'memberId is required' },
        { status: 400 },
      );
    }

    // Get member to verify it exists
    const { data: member, error: fetchError } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('id', memberId)
      .single();

    if (fetchError || !member) {
      return NextResponse.json(
        { message: 'Member not found' },
        { status: 404 },
      );
    }

    if (member.status !== 'pending') {
      return NextResponse.json(
        { message: 'Only pending invitations can be resent' },
        { status: 400 },
      );
    }

    // Update invited_at timestamp to mark as resent
    const { data: updatedMember, error } = await (
      supabase
        .from('workspace_members')
        .update({
          invited_at: new Date().toISOString(),
        })
        .eq('id', memberId)
        .select(
          `
        *,
        role:workspace_roles(id, role_name, role_key, hierarchy_level, color)
      `,
        ) as any
    ).single();

    if (error) {
      console.error('Resend invitation error:', error);
      throw error;
    }

    // Fetch account details
    let memberWithUser: WorkspaceMemberWithData =
      updatedMember as WorkspaceMemberWithData;
    if (updatedMember.user_id) {
      const { data: account } = await supabase
        .from('accounts')
        .select('id, email, name, picture_url')
        .eq('id', updatedMember.user_id)
        .single();

      if (account) {
        memberWithUser = {
          ...updatedMember,
          user: {
            id: account.id,
            email: account.email,
            user_metadata: {
              full_name: account.name,
              avatar_url: account.picture_url,
            },
          },
        } as WorkspaceMemberWithData;
      }
    }

    return successDataResponse(
      'Invitation resent successfully',
      memberWithUser,
    );
  },
);

// ─── Pending Invitations: Fetch, Delete, Resend ────────────────────────────

const getPendingInvitations = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId');
    const search = url.searchParams.get('search');
    const productKey = url.searchParams.get('productKey');

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
        { status: 400 },
      );
    }

    let query = supabase
      .from('workspace_invitations')
      .select(
        `
        id,
        email,
        status,
        invited_at,
        created_at,
        token_expires_at,
        product_key,
        role:workspace_roles(id, role_name, role_key, hierarchy_level, color)
      `,
      )
      .eq('workspace_id', workspaceId)
      .eq('status', 'pending');

    if (productKey) {
      query = query.eq('product_key', productKey);
    }

    if (search) {
      query = query.ilike('email', `%${search}%`);
    }

    query = query.order('created_at', { ascending: false });

    const { data: invitations, error } = await query;

    if (error) {
      console.error('Get pending invitations error:', error);
      throw error;
    }

    return successDataResponse(
      'Pending invitations retrieved successfully',
      invitations || [],
    );
  },
);

const deleteInvitation = catchAsync(
  async ({
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const invitationId = params?.invitationId;

    if (!invitationId) {
      return NextResponse.json(
        { message: 'invitationId is required' },
        { status: 400 },
      );
    }

    // Verify the invitation exists and is still pending
    const { data: invitation, error: fetchError } = await supabase
      .from('workspace_invitations')
      .select('id, status')
      .eq('id', invitationId)
      .single();

    if (fetchError || !invitation) {
      return NextResponse.json(
        { message: 'Invitation not found' },
        { status: 404 },
      );
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { message: 'Only pending invitations can be deleted' },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from('workspace_invitations')
      .delete()
      .eq('id', invitationId);

    if (error) {
      console.error('Delete invitation error:', error);
      throw error;
    }

    return successDataResponse('Invitation deleted successfully');
  },
);

const resendInvitationEmail = catchAsync(
  async ({
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const invitationId = params?.invitationId;

    if (!invitationId) {
      return NextResponse.json(
        { message: 'invitationId is required' },
        { status: 400 },
      );
    }

    // Fetch the invitation with all needed fields
    const { data: invitation, error: fetchError } = await supabase
      .from('workspace_invitations')
      .select('id, email, token, status, workspace_id, invited_at, token_expires_at')
      .eq('id', invitationId)
      .single();

    if (fetchError || !invitation) {
      return NextResponse.json(
        { message: 'Invitation not found' },
        { status: 404 },
      );
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { message: 'Only pending invitations can be resent' },
        { status: 400 },
      );
    }

    // If token has expired, regenerate a fresh token and extend the expiry
    let activeToken = invitation.token;
    const now = new Date();
    const isExpired =
      invitation.token_expires_at &&
      new Date(invitation.token_expires_at) < now;

    if (isExpired || !activeToken) {
      const generateToken = () =>
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);

      activeToken = generateToken();
      const newExpiresAt = new Date(
        now.getTime() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString();

      const { error: tokenUpdateError } = await supabase
        .from('workspace_invitations')
        .update({ token: activeToken, token_expires_at: newExpiresAt })
        .eq('id', invitationId);

      if (tokenUpdateError) {
        console.error('Regenerate token error:', tokenUpdateError);
        throw tokenUpdateError;
      }
    }

    // Fetch workspace details for email
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, name, company_id')
      .eq('id', invitation.workspace_id)
      .single();

    let billingCountry = 'US';
    if (workspace?.company_id) {
      const { data: company } = await supabase
        .from('companies')
        .select('billing_country')
        .eq('id', workspace.company_id)
        .single();
      if (company?.billing_country) {
        billingCountry = company.billing_country;
      }
    }

    // Get inviter info
    const { data: { user } = {} } = await supabase.auth.getUser();
    let inviterName = user?.user_metadata?.email || 'Someone';
    if (user) {
      const { data: userData } = await supabase
        .from('accounts')
        .select('name')
        .eq('id', user.id)
        .single();
      inviterName = userData?.name || inviterName;
    }

    // Re-send the invitation email (use activeToken which may have been regenerated)
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite?token=${activeToken}`;

    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: invitation.email,
        replyTo: user?.email || process.env.SMTP_USER,
        subject: `${inviterName} invited you to join ${workspace?.name || 'Workspace'} on ${process.env.NEXT_PUBLIC_PRODUCT_NAME || 'Leadgaze'}`,
        html: INVITE_MEMBER_TEMPLATE({
          inviteLink: inviteUrl,
          workspaceName: workspace?.name || 'Workspace',
          inviterName,
          productName: process.env.NEXT_PUBLIC_PRODUCT_NAME || 'Leadgaze',
          appUrl: process.env.NEXT_PUBLIC_APP_URL,
          billingCountry,
        }),
      });
    } catch (error) {
      console.error('Resend invitation email error:', error);
      return NextResponse.json(
        { message: 'Failed to send invitation email' },
        { status: 500 },
      );
    }

    // Update invited_at timestamp
    const { data: updatedInvitation, error: updateError } = await supabase
      .from('workspace_invitations')
      .update({ invited_at: new Date().toISOString() })
      .eq('id', invitationId)
      .select(
        `
        id,
        email,
        status,
        invited_at,
        created_at,
        token_expires_at,
        role:workspace_roles(id, role_name, role_key, hierarchy_level, color)
      `,
      )
      .single();

    if (updateError) {
      console.error('Update invitation timestamp error:', updateError);
      throw updateError;
    }

    return successDataResponse(
      'Invitation resent successfully',
      updatedInvitation,
    );
  },
);

export {
  getMembers,
  getMemberById,
  inviteMember,
  updateMember,
  removeMember,
  resendInvitation,
  getPendingInvitations,
  deleteInvitation,
  resendInvitationEmail,
};
