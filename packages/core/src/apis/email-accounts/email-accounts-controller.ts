import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  getWorkspaceMemberContext,
  listWorkspaceEmailAccounts,
} from '../../lib/email/account-access';
import { encrypt } from '../../lib/email/crypto';
import { catchAsync, successDataResponse } from '../../utils/response-handler';

function normalizeEmail(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

export const getCoreEmailAccountsController = catchAsync(
  async ({ request }) => {
    const url = new URL(request.url);
    const workspaceId =
      url.searchParams.get('workspace_id') ??
      url.searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: 'workspace_id is required' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();
    const accounts = await listWorkspaceEmailAccounts(supabase, workspaceId);

    return NextResponse.json(accounts);
  },
);

export const createCoreSmtpAccountController = catchAsync(
  async ({ request }) => {
    const url = new URL(request.url);
    const workspaceId =
      url.searchParams.get('workspace_id') ??
      url.searchParams.get('workspaceId');
    const body = await request.json().catch(() => null);

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: 'workspace_id is required' },
        { status: 400 },
      );
    }

    if (
      !body?.email ||
      !body?.host ||
      !body?.port ||
      !body?.username ||
      !body?.password
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'SMTP email, host, port, username, and password are required',
        },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();
    const memberContext = await getWorkspaceMemberContext(
      supabase,
      workspaceId,
    );

    if (!memberContext) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 },
      );
    }

    const accessScope =
      memberContext.isAdmin && body.access_scope === 'workspace'
        ? 'workspace'
        : 'private';

    const { data, error } = await (supabase as any)
      .schema('core')
      .from('email_accounts')
      .upsert(
        {
          workspace_id: workspaceId,
          email: normalizeEmail(body.email),
          from_name: body.from_name,
          provider: 'smtp',
          smtp_host: body.host,
          smtp_port: body.port,
          smtp_secure: body.secure ?? true,
          smtp_username: body.username,
          smtp_password: encrypt(body.password),
          imap_host: body.imap_host || null,
          imap_port: body.imap_port || null,
          imap_secure: body.imap_secure ?? true,
          imap_username: body.imap_username ?? body.username,
          imap_password: body.imap_password
            ? encrypt(body.imap_password)
            : encrypt(body.password),
          owner_user_id: memberContext.userId,
          access_scope: accessScope,
          is_active: true,
          is_sync_enabled: true,
          inbound_enabled: Boolean(body.imap_host),
          outbound_enabled: true,
          last_error: null,
          settings: {},
          updated_by: memberContext.userId,
          created_by: memberContext.userId,
        },
        { onConflict: 'workspace_id,email' },
      )
      .select('*')
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 },
      );
    }

    return successDataResponse('Email account saved successfully', data);
  },
);

export const updateCoreEmailAccountController = catchAsync(
  async ({ request }) => {
    const body = await request.json().catch(() => null);
    const {
      id,
      workspace_id: workspaceId,
      workspaceId: camelWorkspaceId,
      is_active,
      is_sync_enabled,
      access_scope,
    } = body ?? {};
    const resolvedWorkspaceId = workspaceId ?? camelWorkspaceId;

    if (!id || !resolvedWorkspaceId) {
      return NextResponse.json(
        { success: false, message: 'id and workspace_id are required' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();
    const memberContext = await getWorkspaceMemberContext(
      supabase,
      resolvedWorkspaceId,
    );

    if (!memberContext) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 },
      );
    }

    const { data: existingAccount } = await (supabase as any)
      .schema('core')
      .from('email_accounts')
      .select('id,owner_user_id')
      .eq('id', id)
      .eq('workspace_id', resolvedWorkspaceId)
      .single();

    if (!existingAccount) {
      return NextResponse.json(
        { success: false, message: 'Email account not found' },
        { status: 404 },
      );
    }

    const isOwner = existingAccount.owner_user_id === memberContext.userId;
    if (!memberContext.isAdmin && !isOwner) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 },
      );
    }

    if (typeof access_scope !== 'undefined' && !memberContext.isAdmin && !isOwner) {
      return NextResponse.json(
        { success: false, message: 'Only admins or account owners can change account access' },
        { status: 403 },
      );
    }

    const updatePayload: Record<string, unknown> = {
      updated_by: memberContext.userId,
    };
    if (typeof is_active === 'boolean') updatePayload.is_active = is_active;
    if (typeof is_sync_enabled === 'boolean') {
      updatePayload.is_sync_enabled = is_sync_enabled;
    }
    if (access_scope) updatePayload.access_scope = access_scope;

    const { data, error } = await (supabase as any)
      .schema('core')
      .from('email_accounts')
      .update(updatePayload)
      .eq('id', id)
      .eq('workspace_id', resolvedWorkspaceId)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 },
      );
    }

    return successDataResponse('Email account updated successfully', data);
  },
);

export const deleteCoreEmailAccountController = catchAsync(
  async ({ request }) => {
    const url = new URL(request.url);
    const id = Number(url.searchParams.get('id'));
    const workspaceId =
      url.searchParams.get('workspace_id') ??
      url.searchParams.get('workspaceId');

    if (!id || !workspaceId) {
      return NextResponse.json(
        { success: false, message: 'id and workspace_id are required' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();
    const memberContext = await getWorkspaceMemberContext(
      supabase,
      workspaceId,
    );

    if (!memberContext) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 },
      );
    }

    const { data: existingAccount } = await (supabase as any)
      .schema('core')
      .from('email_accounts')
      .select('id,owner_user_id,settings')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (!existingAccount) {
      return NextResponse.json(
        { success: false, message: 'Email account not found' },
        { status: 404 },
      );
    }

    const isOwner = existingAccount.owner_user_id === memberContext.userId;
    if (!memberContext.isAdmin && !isOwner) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 },
      );
    }

    const { error } = await (supabase as any)
      .schema('core')
      .from('email_accounts')
      .update({
        is_active: false,
        is_sync_enabled: false,
        inbound_enabled: false,
        outbound_enabled: false,
        last_error: null,
        settings: {
          ...((existingAccount as any).settings ?? {}),
          deleted_at: new Date().toISOString(),
          deleted_by: memberContext.userId,
        },
        updated_by: memberContext.userId,
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 },
      );
    }

    return successDataResponse('Email account deleted successfully', { id });
  },
);
