import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { catchAsync, successDataResponse } from '~/utils/response-handler';

const acceptInvite = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const { token, userId } = await request.json();

    if (!token || !userId) {
      return NextResponse.json(
        { message: 'token and userId are required' },
        { status: 400 },
      );
    }

    // Find the invitation by token
    const { data: invitation, error: inviteError } = await supabase
      .from('workspace_invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json(
        { message: 'Invalid or expired invitation token' },
        { status: 404 },
      );
    }

    // Check if invitation is still valid
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { message: `Invitation has already been ${invitation.status}` },
        { status: 400 },
      );
    }

    // Check if token has expired
    if (
      invitation.token_expires_at &&
      new Date(invitation.token_expires_at!) < new Date()
    ) {
      return NextResponse.json(
        { message: 'Invitation token has expired' },
        { status: 400 },
      );
    }

    // Update invitation status to accepted and link user
    const { error: updateInviteError } = await supabase
      .from('workspace_invitations')
      .update({
        status: 'accepted',
        user_id: userId,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    if (updateInviteError) {
      console.error('Update invitation error:', updateInviteError);
      throw updateInviteError;
    }

    // Check if a member record already exists (e.g. previously removed user)
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', invitation.workspace_id)
      .eq('user_id', userId)
      .maybeSingle();

    let member;

    if (existingMember) {
      // Re-activate the existing member record instead of inserting a duplicate
      const { data: updatedMember, error: updateMemberError } = await supabase
        .from('workspace_members')
        .update({
          role_id: invitation.role_id,
          status: 'accepted',
          invited_by: invitation.invited_by,
          invited_at: invitation.invited_at,
          accepted_at: new Date().toISOString(),
          is_primary_contact: invitation.is_primary_contact,
          personal_settings: invitation.personal_settings,
        })
        .eq('id', existingMember.id)
        .select()
        .single();

      if (updateMemberError) {
        console.error('Re-activate member error:', updateMemberError);
        throw updateMemberError;
      }

      member = updatedMember;
    } else {
      // Create a new workspace member record
      const { data: newMember, error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: invitation.workspace_id,
          user_id: userId,
          role_id: invitation.role_id,
          status: 'accepted',
          invited_by: invitation.invited_by,
          invited_at: invitation.invited_at,
          accepted_at: new Date().toISOString(),
          is_primary_contact: invitation.is_primary_contact,
          personal_settings: invitation.personal_settings,
        })
        .select()
        .single();

      if (memberError) {
        console.error('Create member error:', memberError);
        throw memberError;
      }

      member = newMember;
    }

    // Get workspace details to return
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, name, slug')
      .eq('id', invitation.workspace_id)
      .single();

    // ── Auto-assign seat for the specific module the invitation was for ──────
    // If the invitation has a product_key, only assign a seat for that module.
    // If no product_key (legacy invites), assign seats for all active modules.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invitationProductKey = (invitation as any).product_key ?? null;
    await autoAssignSeats(
      invitation.workspace_id,
      userId,
      invitationProductKey,
    );

    return successDataResponse('Invitation accepted successfully', {
      workspace,
      member,
      product_key: invitationProductKey,
      message: 'You now have access to the workspace',
    });
  },
);

// ─── Helper: Auto-assign seat for specific module (or all if productKey is null) ──

async function autoAssignSeats(
  workspaceId: string,
  userId: string,
  productKey: string | null,
) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminClient = getSupabaseServerAdminClient() as any;

    // 1. Get active/trialing module seats for this workspace
    //    If productKey is provided, only fetch that specific product's seat.
    let seatQuery = adminClient
      .from('workspace_module_seats')
      .select(
        'id, product_id, seats_purchased, seats_used, status, subscription_products!inner(product_key)',
      )
      .eq('workspace_id', workspaceId)
      .in('status', ['active', 'trialing']);

    if (productKey) {
      seatQuery = seatQuery.eq('subscription_products.product_key', productKey);
    }

    const { data: seats } = await seatQuery;

    if (!seats || seats.length === 0) return;

    // 2. Get existing active seat assignments for this user in this workspace
    const { data: existingAssignments } = await adminClient
      .from('seat_assignments')
      .select('product_id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('is_active', true);

    const assignedProductIds = new Set(
      (existingAssignments || []).map(
        (a: { product_id: string }) => a.product_id,
      ),
    );

    // 3. For each seat with available capacity, create assignment
    const newAssignments: Array<{
      seat_id: string;
      workspace_id: string;
      user_id: string;
      product_id: string;
      is_active: boolean;
      assigned_by: string;
    }> = [];

    for (const seat of seats) {
      // Skip if user already has a seat for this product
      if (assignedProductIds.has(seat.product_id)) continue;

      // Skip if no capacity available
      if (seat.seats_used >= seat.seats_purchased) continue;

      newAssignments.push({
        seat_id: seat.id,
        workspace_id: workspaceId,
        user_id: userId,
        product_id: seat.product_id,
        is_active: true,
        assigned_by: userId, // self-assigned on join
      });
    }

    if (newAssignments.length > 0) {
      await adminClient.from('seat_assignments').insert(newAssignments);
    }
  } catch (error) {
    // Log but don't fail the invite acceptance if seat assignment fails
    console.error('Auto-assign seats error:', error);
  }
}

export { acceptInvite };
