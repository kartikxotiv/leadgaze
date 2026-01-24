import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import INVITE_MEMBER_TEMPLATE from '~/constants/email.templates/member-invite.template';
import { transporter } from '~/utils/send-mail';

import { Database } from '../../../lib/database.types';
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

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
        { status: 400 },
      );
    }

    // Get members with related role data via join
    const { data: members, error } = await (
      supabase.from('workspace_members').select(
        `
        *,
        role:workspace_roles(id, role_name, role_key, hierarchy_level, color)
      `,
      ) as any
    )
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get members error:', error);
      throw error;
    }

    // Fetch account details for all members
    if (members && members.length > 0) {
      const userIds = members.map((m: any) => m.user_id).filter(Boolean);
      if (userIds.length > 0) {
        const { data: accounts } = await supabase
          .from('accounts')
          .select('id, email, name, picture_url')
          .in('id', userIds);

        const accountMap = new Map(accounts?.map((a) => [a.id, a]) || []);

        // Map account data to members
        const membersWithUsers = members.map((member: any) => ({
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

        return successDataResponse(
          'Members retrieved successfully',
          membersWithUsers,
        );
      }
    }

    return successDataResponse(
      'Members retrieved successfully',
      members as WorkspaceMemberWithData[],
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
    const url = new URL(request.url);
    // const workspaceId = url.searchParams.get('workspaceId');
    const { email, role_id, workspaceId } = await request.json();

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
      .select('id, name')
      .eq('id', workspaceId)
      .single();

    // Send invitation email
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite?token=${token}`;
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: `You've been invited to join a workspace - ${process.env.NEXT_PUBLIC_PRODUCT_NAME || 'Leadgaze'}`,
        html: INVITE_MEMBER_TEMPLATE({
          inviteLink: inviteUrl,
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

    // Get current member
    const { data: currentMember, error: fetchError } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('id', memberId)
      .single();

    if (fetchError || !currentMember) {
      return NextResponse.json(
        { message: 'Member not found' },
        { status: 404 },
      );
    }

    // If changing role, verify new role exists in same workspace
    if (role_id) {
      const { data: role, error: roleError } = await supabase
        .from('workspace_roles')
        .select('id')
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

    // Get current member
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
    const workspaceId = url.searchParams.get('workspaceId');
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

export {
  getMembers,
  getMemberById,
  inviteMember,
  updateMember,
  removeMember,
  resendInvitation,
};
