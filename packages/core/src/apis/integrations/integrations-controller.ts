/**
 * Core Integrations Controller
 * Manages integration connections and accounts for meeting providers
 */
import { NextResponse } from 'next/server';

import { google } from 'googleapis';
import { Buffer } from 'node:buffer';

import { GOOGLE_CALENDAR_SCOPES } from '@kit/integration-google';
import { ZOOM_SCOPES } from '@kit/integration-zoom';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { catchAsync, successDataResponse } from '../../utils/response-handler';
import { assertCoreWorkspaceAccess } from '../_shared/workspace-access';

// =============================================================================
// CONNECTION CONTROLLERS
// =============================================================================

/**
 * GET /api/core/integrations/connections
 * Get integration connections for a workspace
 */
export const getIntegrationConnectionsController = catchAsync(
  async ({ request }) => {
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId');
    const provider = url.searchParams.get('provider');

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: 'workspaceId is required' },
        { status: 400 },
      );
    }

    const { supabase, error } = await assertCoreWorkspaceAccess(workspaceId);
    if (error) return error;

    let query = (supabase as any)
      .schema('core')
      .from('integration_connections')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false);

    if (provider) {
      query = query.eq('provider', provider);
    }

    const { data, error: fetchError } = await query.order('created_at', {
      ascending: false,
    });

    if (fetchError) {
      console.error('Fetch connections error:', fetchError);
      return NextResponse.json(
        { success: false, message: 'Failed to retrieve connections' },
        { status: 500 },
      );
    }

    return successDataResponse('Connections retrieved', data ?? []);
  },
);

/**
 * POST /api/core/integrations/connections
 * Create or update an integration connection
 */
export const createIntegrationConnectionController = catchAsync(
  async ({ request }) => {
    const body = await request.json().catch(() => null);
    const workspaceId = body?.workspace_id ?? body?.workspaceId;
    const provider = body?.provider;

    if (!workspaceId || !provider) {
      return NextResponse.json(
        { success: false, message: 'workspace_id and provider are required' },
        { status: 400 },
      );
    }

    const { supabase, user, error } =
      await assertCoreWorkspaceAccess(workspaceId);
    if (error || !user) return error!;

    // Check if connection already exists
    const { data: existing } = await (supabase as any)
      .schema('core')
      .from('integration_connections')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('provider', provider)
      .eq('is_deleted', false)
      .maybeSingle();

    if (existing) {
      // Update existing connection
      const { data, error: updateError } = await (supabase as any)
        .schema('core')
        .from('integration_connections')
        .update({
          status: body.status ?? 'active',
          config: body.config ?? {},
          updated_by: user.id,
        })
        .eq('id', existing.id)
        .select('*')
        .single();

      if (updateError) {
        console.error('Update connection error:', updateError);
        return NextResponse.json(
          { success: false, message: 'Failed to update connection' },
          { status: 500 },
        );
      }

      return successDataResponse('Connection updated', data);
    }

    // Create new connection
    const { data, error: insertError } = await (supabase as any)
      .schema('core')
      .from('integration_connections')
      .insert({
        workspace_id: workspaceId,
        provider,
        status: body.status ?? 'active',
        config: body.config ?? {},
        created_by: user.id,
        updated_by: user.id,
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('Create connection error:', insertError);
      return NextResponse.json(
        { success: false, message: 'Failed to create connection' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, message: 'Connection created', data },
      { status: 201 },
    );
  },
);

/**
 * DELETE /api/core/integrations/connections
 * Soft delete an integration connection
 */
export const deleteIntegrationConnectionController = catchAsync(
  async ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const workspaceId = url.searchParams.get('workspaceId');

    if (!id || !workspaceId) {
      return NextResponse.json(
        { success: false, message: 'id and workspaceId are required' },
        { status: 400 },
      );
    }

    const { supabase, user, error } =
      await assertCoreWorkspaceAccess(workspaceId);
    if (error || !user) return error!;

    // Soft delete the connection and all associated accounts
    const { error: deleteError } = await (supabase as any)
      .schema('core')
      .from('integration_connections')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq('id', id);

    if (deleteError) {
      console.error('Delete connection error:', deleteError);
      return NextResponse.json(
        { success: false, message: 'Failed to delete connection' },
        { status: 500 },
      );
    }

    // Also soft delete associated accounts
    await (supabase as any)
      .schema('core')
      .from('integration_accounts')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq('connection_id', id);

    return successDataResponse('Connection deleted', { id });
  },
);

// =============================================================================
// ACCOUNT CONTROLLERS
// =============================================================================

/**
 * GET /api/core/integrations/accounts
 * Get integration accounts for a workspace/connection
 */
export const getIntegrationAccountsController = catchAsync(
  async ({ request }) => {
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId');
    const connectionId = url.searchParams.get('connectionId');
    const provider = url.searchParams.get('provider');

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: 'workspaceId is required' },
        { status: 400 },
      );
    }

    const { supabase, user, error } =
      await assertCoreWorkspaceAccess(workspaceId);
    if (error || !user) return error!;

    let query = (supabase as any)
      .schema('core')
      .from('integration_accounts')
      .select(
        `
      *,
      connection:integration_connections(id, provider, status)
    `,
      )
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false);

    if (connectionId) {
      query = query.eq('connection_id', connectionId);
    }

    const { data, error: fetchError } = await query.order('created_at', {
      ascending: false,
    });

    if (fetchError) {
      console.error('Fetch accounts error:', fetchError);
      return NextResponse.json(
        { success: false, message: 'Failed to retrieve accounts' },
        { status: 500 },
      );
    }

    // Filter by provider if specified
    let accounts = data ?? [];
    if (provider) {
      accounts = accounts.filter(
        (acc: { connection?: { provider?: string } | null }) =>
          acc.connection?.provider === provider,
      );
    }

    // For non-admin users, only show their own accounts or workspace-scoped accounts
    const filteredAccounts = accounts
      .map((acc: any) => {
        // Check access
        const isOwner = acc.owner_user_id === user.id;
        const isWorkspaceScope = acc.access_scope === 'workspace';
        const canView = isOwner || isWorkspaceScope;

        if (!canView) return null;

        // Don't expose tokens to client
        const { tokens: _tokens, ...safeAccount } = acc;
        return safeAccount;
      })
      .filter(Boolean);

    return successDataResponse('Accounts retrieved', filteredAccounts);
  },
);

/**
 * POST /api/core/integrations/google/auth
 * Initiate Google OAuth flow for calendar integration
 */
export const googleIntegrationAuthController = catchAsync(
  async ({ request }) => {
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspace_id');
    const returnUrl = url.searchParams.get('return_url');

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: 'workspace_id is required' },
        { status: 400 },
      );
    }

    const { user, error } = await assertCoreWorkspaceAccess(workspaceId);
    if (error || !user) return error!;

    const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/core/integrations/google/callback`;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl,
    );

    const state = JSON.stringify({
      workspaceId,
      userId: user.id,
      returnUrl: returnUrl || '/home/sales/meetings',
      source: 'meetings-integration',
    });

    const encodedState = Buffer.from(state).toString('base64');

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: GOOGLE_CALENDAR_SCOPES,
      state: encodedState,
      prompt: 'consent',
    });

    return NextResponse.redirect(authUrl);
  },
);

/**
 * GET /api/core/integrations/google/callback
 * Handle Google OAuth callback for calendar integration
 */
export const googleIntegrationCallbackController = catchAsync(
  async ({ request }) => {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const errorParam = url.searchParams.get('error');

    const fallbackUrl = '/home/sales/meetings?error=oauth_error';

    if (errorParam) {
      return NextResponse.redirect(new URL(fallbackUrl, request.url));
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/home/sales/meetings?error=missing_params', request.url),
      );
    }

    let decodedState: {
      workspaceId: string;
      userId: string;
      returnUrl: string;
      source?: string;
    };

    try {
      decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    } catch {
      return NextResponse.redirect(
        new URL('/home/sales/meetings?error=invalid_state', request.url),
      );
    }

    if (!decodedState?.workspaceId) {
      return NextResponse.redirect(
        new URL('/home/sales/meetings?error=invalid_state', request.url),
      );
    }

    try {
      const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/core/integrations/google/callback`;

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        callbackUrl,
      );

      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // Get user info
      const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
      const { data: userInfo } = await oauth2.userinfo.get();

      if (!userInfo.email) {
        return NextResponse.redirect(
          new URL('/home/sales/meetings?error=no_email', request.url),
        );
      }

      const supabase = getSupabaseServerClient();

      // Get or create integration connection for Google (per user, not per workspace)
      // First check if this user already has a connection
      let { data: connection } = await (supabase as any)
        .schema('core')
        .from('integration_connections')
        .select('id')
        .eq('workspace_id', decodedState.workspaceId)
        .eq('provider', 'GOOGLE')
        .eq('created_by', decodedState.userId)
        .eq('is_deleted', false)
        .maybeSingle();

      if (!connection) {
        const { data: newConnection, error: connError } = await (
          supabase as any
        )
          .schema('core')
          .from('integration_connections')
          .insert({
            workspace_id: decodedState.workspaceId,
            provider: 'GOOGLE',
            status: 'active',
            config: {},
            created_by: decodedState.userId,
            updated_by: decodedState.userId,
          })
          .select('id')
          .single();

        if (connError) {
          console.error('Create connection error:', connError);
          return NextResponse.redirect(
            new URL(
              '/home/sales/meetings?error=connection_failed',
              request.url,
            ),
          );
        }

        connection = newConnection;
      }

      // Upsert integration account (partial unique index requires select-then-upsert)
      const { data: existingAccount } = await (supabase as any)
        .schema('core')
        .from('integration_accounts')
        .select('id')
        .eq('connection_id', connection.id)
        .eq('external_account_id', userInfo.id ?? userInfo.email)
        .eq('is_deleted', false)
        .maybeSingle();

      let account: { id: string } | null = null;
      if (existingAccount) {
        const { data: updated, error: updateErr } = await (supabase as any)
          .schema('core')
          .from('integration_accounts')
          .update({
            email: userInfo.email,
            display_name: userInfo.name ?? userInfo.email,
            metadata: { picture: userInfo.picture },
            status: 'active',
            updated_by: decodedState.userId,
          })
          .eq('id', existingAccount.id)
          .select('id')
          .single();

        if (updateErr) {
          console.error('Update account error:', updateErr);
          return NextResponse.redirect(
            new URL('/home/sales/meetings?error=account_failed', request.url),
          );
        }
        account = updated;
      } else {
        const { data: inserted, error: insertErr } = await (supabase as any)
          .schema('core')
          .from('integration_accounts')
          .insert({
            workspace_id: decodedState.workspaceId,
            connection_id: connection.id,
            external_account_id: userInfo.id ?? userInfo.email,
            email: userInfo.email,
            display_name: userInfo.name ?? userInfo.email,
            metadata: { picture: userInfo.picture },
            status: 'active',
            owner_user_id: decodedState.userId,
            access_scope: 'private',
            created_by: decodedState.userId,
            updated_by: decodedState.userId,
          })
          .select('id')
          .single();

        if (insertErr) {
          console.error('Create account error:', insertErr);
          return NextResponse.redirect(
            new URL('/home/sales/meetings?error=account_failed', request.url),
          );
        }
        account = inserted;
      }

      if (!account) {
        return NextResponse.redirect(
          new URL('/home/sales/meetings?error=account_failed', request.url),
        );
      }

      // Upsert tokens (select-then-insert for safety)
      const { data: existingToken } = await (supabase as any)
        .schema('core')
        .from('integration_tokens')
        .select('id')
        .eq('account_id', account!.id)
        .maybeSingle();

      let tokenError;
      if (existingToken) {
        const { error } = await (supabase as any)
          .schema('core')
          .from('integration_tokens')
          .update({
            access_token: tokens.access_token ?? '',
            refresh_token: tokens.refresh_token ?? null,
            expires_at: tokens.expiry_date
              ? new Date(tokens.expiry_date).toISOString()
              : null,
            token_type: tokens.token_type ?? 'Bearer',
            scopes: GOOGLE_CALENDAR_SCOPES,
            last_refreshed_at: new Date().toISOString(),
            last_error: null,
            error_count: 0,
          })
          .eq('id', existingToken.id);
        tokenError = error;
      } else {
        const { error } = await (supabase as any)
          .schema('core')
          .from('integration_tokens')
          .insert({
            workspace_id: decodedState.workspaceId,
            account_id: account!.id,
            access_token: tokens.access_token ?? '',
            refresh_token: tokens.refresh_token ?? null,
            expires_at: tokens.expiry_date
              ? new Date(tokens.expiry_date).toISOString()
              : null,
            token_type: tokens.token_type ?? 'Bearer',
            scopes: GOOGLE_CALENDAR_SCOPES,
            last_refreshed_at: new Date().toISOString(),
            last_error: null,
            error_count: 0,
          });
        tokenError = error;
      }

      if (tokenError) {
        console.error('Save tokens error:', tokenError);
        return NextResponse.redirect(
          new URL('/home/sales/meetings?error=token_failed', request.url),
        );
      }

      const redirectUrl = decodedState.returnUrl || '/home/sales/meetings';
      return NextResponse.redirect(
        new URL(`${redirectUrl}?connected=true`, request.url),
      );
    } catch (err) {
      console.error('Google integration callback error:', err);
      return NextResponse.redirect(
        new URL('/home/sales/meetings?error=auth_failed', request.url),
      );
    }
  },
);

/**
 * DELETE /api/core/integrations/accounts
 * Disconnect an integration account
 */
export const deleteIntegrationAccountController = catchAsync(
  async ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const workspaceId = url.searchParams.get('workspaceId');

    if (!id || !workspaceId) {
      return NextResponse.json(
        { success: false, message: 'id and workspaceId are required' },
        { status: 400 },
      );
    }

    const { supabase, user, error } =
      await assertCoreWorkspaceAccess(workspaceId);
    if (error || !user) return error!;

    // Get the account to verify ownership or admin
    const { data: account } = await (supabase as any)
      .schema('core')
      .from('integration_accounts')
      .select('owner_user_id')
      .eq('id', id)
      .maybeSingle();

    if (!account) {
      return NextResponse.json(
        { success: false, message: 'Account not found' },
        { status: 404 },
      );
    }

    // Soft delete the account
    const { error: deleteError } = await (supabase as any)
      .schema('core')
      .from('integration_accounts')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq('id', id);

    if (deleteError) {
      console.error('Delete account error:', deleteError);
      return NextResponse.json(
        { success: false, message: 'Failed to delete account' },
        { status: 500 },
      );
    }

    // Delete tokens
    await (supabase as any)
      .schema('core')
      .from('integration_tokens')
      .delete()
      .eq('account_id', id);

    return successDataResponse('Account disconnected', { id });
  },
);

// =============================================================================
// GOOGLE MEETING CREATION CONTROLLER
// =============================================================================

/**
 * POST /api/core/integrations/google/create-meeting
 * Create a Google Meet meeting via Calendar API
 */
export const createGoogleMeetingController = catchAsync(async ({ request }) => {
  const body = await request.json().catch(() => null);
  const workspaceId = body?.workspace_id ?? body?.workspaceId;
  const accountId = body?.account_id ?? body?.accountId;

  if (!workspaceId || !accountId) {
    return NextResponse.json(
      { success: false, message: 'workspace_id and account_id are required' },
      { status: 400 },
    );
  }

  if (!body?.title || !body?.start_time || !body?.end_time) {
    return NextResponse.json(
      {
        success: false,
        message: 'title, start_time, and end_time are required',
      },
      { status: 400 },
    );
  }

  const { supabase, error } = await assertCoreWorkspaceAccess(workspaceId);
  if (error) return error;

  try {
    // Get account tokens
    const { data: tokens } = await (supabase as any)
      .schema('core')
      .from('integration_tokens')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (!tokens?.access_token || !tokens?.refresh_token) {
      return NextResponse.json(
        { success: false, message: 'No valid tokens found for account' },
        { status: 400 },
      );
    }

    // Create OAuth client and set credentials
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );

    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expires_at
        ? new Date(tokens.expires_at).getTime()
        : undefined,
    });

    // Refresh token if needed
    const expiryTime = tokens.expires_at
      ? new Date(tokens.expires_at).getTime()
      : 0;
    if (Date.now() >= expiryTime - 5 * 60 * 1000) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);

      // Update tokens in DB
      await (supabase as any)
        .schema('core')
        .from('integration_tokens')
        .update({
          access_token: credentials.access_token,
          expires_at: credentials.expiry_date
            ? new Date(credentials.expiry_date).toISOString()
            : null,
          last_refreshed_at: new Date().toISOString(),
        })
        .eq('account_id', accountId);
    }

    // Create calendar event with Meet
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const event: any = {
      summary: body.title,
      description: body.description,
      start: {
        dateTime: body.start_time,
        timeZone: body.timezone ?? 'UTC',
      },
      end: {
        dateTime: body.end_time,
        timeZone: body.timezone ?? 'UTC',
      },
      conferenceData: {
        createRequest: {
          requestId: `meet_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    };

    if (body.attendees && Array.isArray(body.attendees)) {
      console.log(
        '[createGoogleMeeting] Attendees:',
        JSON.stringify(body.attendees),
      );
      event.attendees = body.attendees.map(
        (a: { email: string; display_name?: string }) => ({
          email: a.email,
          displayName: a.display_name,
        }),
      );
    }

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: 1,
      sendUpdates: body.send_invites !== false ? 'all' : 'none',
    });

    const conferenceData = response.data.conferenceData;
    const videoEntry = conferenceData?.entryPoints?.find(
      (ep) => ep.entryPointType === 'video',
    );

    return NextResponse.json({
      success: true,
      message: 'Google meeting created',
      data: {
        provider_event_id: response.data.id,
        provider_meeting_id: conferenceData?.conferenceId,
        meeting_url: videoEntry?.uri,
      },
    });
  } catch (err) {
    console.error('Create Google meeting error:', err);
    const gError = err as { code?: number; message?: string };

    if (gError.code === 401) {
      return NextResponse.json(
        {
          success: false,
          message: 'Google authentication expired. Please reconnect.',
        },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to create Google meeting' },
      { status: 500 },
    );
  }
});

// =============================================================================
// GOOGLE MEETING UPDATE CONTROLLER
// =============================================================================

/**
 * POST /api/core/integrations/google/update-meeting
 * Update a Google Calendar event
 */
export const updateGoogleMeetingController = catchAsync(async ({ request }) => {
  const body = await request.json().catch(() => null);
  const workspaceId = body?.workspace_id ?? body?.workspaceId;
  const accountId = body?.account_id ?? body?.accountId;
  const providerEventId = body?.provider_event_id ?? body?.providerEventId;

  if (!workspaceId || !accountId || !providerEventId) {
    return NextResponse.json(
      {
        success: false,
        message: 'workspace_id, account_id, and provider_event_id are required',
      },
      { status: 400 },
    );
  }

  const { supabase, error } = await assertCoreWorkspaceAccess(workspaceId);
  if (error) return error;

  try {
    // Get account tokens
    const { data: tokens } = await (supabase as any)
      .schema('core')
      .from('integration_tokens')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (!tokens?.access_token || !tokens?.refresh_token) {
      return NextResponse.json(
        { success: false, message: 'No valid tokens found for account' },
        { status: 400 },
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );

    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expires_at
        ? new Date(tokens.expires_at).getTime()
        : undefined,
    });

    // Refresh token if needed
    const expiryTime = tokens.expires_at
      ? new Date(tokens.expires_at).getTime()
      : 0;
    if (Date.now() >= expiryTime - 5 * 60 * 1000) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);

      await (supabase as any)
        .schema('core')
        .from('integration_tokens')
        .update({
          access_token: credentials.access_token,
          expires_at: credentials.expiry_date
            ? new Date(credentials.expiry_date).toISOString()
            : null,
          last_refreshed_at: new Date().toISOString(),
        })
        .eq('account_id', accountId);
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Build update payload - only include fields that are provided
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const event: any = {};

    if (body.title !== undefined) event.summary = body.title;
    if (body.description !== undefined) event.description = body.description;
    if (body.start_time || body.startTime) {
      event.start = {
        dateTime: body.start_time ?? body.startTime,
        timeZone: body.timezone ?? 'UTC',
      };
    }
    if (body.end_time || body.endTime) {
      event.end = {
        dateTime: body.end_time ?? body.endTime,
        timeZone: body.timezone ?? 'UTC',
      };
    }

    // Update attendees if provided
    if (body.attendees && Array.isArray(body.attendees)) {
      event.attendees = body.attendees.map(
        (a: { email: string; display_name?: string }) => ({
          email: a.email,
          displayName: a.display_name,
        }),
      );
    }

    const response = await calendar.events.patch({
      calendarId: 'primary',
      eventId: providerEventId,
      requestBody: event,
      sendUpdates: body.send_invites !== false ? 'all' : 'none',
    });

    return NextResponse.json({
      success: true,
      message: 'Google meeting updated',
      data: {
        provider_event_id: response.data.id,
      },
    });
  } catch (err) {
    console.error('Update Google meeting error:', err);
    const gError = err as { code?: number; message?: string };

    if (gError.code === 401) {
      return NextResponse.json(
        {
          success: false,
          message: 'Google authentication expired. Please reconnect.',
        },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to update Google meeting' },
      { status: 500 },
    );
  }
});

// =============================================================================
// GOOGLE MEETING DELETE CONTROLLER
// =============================================================================

/**
 * POST /api/core/integrations/google/delete-meeting
 * Delete a Google Calendar event
 */
export const deleteGoogleMeetingController = catchAsync(async ({ request }) => {
  const body = await request.json().catch(() => null);
  const workspaceId = body?.workspace_id ?? body?.workspaceId;
  const accountId = body?.account_id ?? body?.accountId;
  const providerEventId = body?.provider_event_id ?? body?.providerEventId;

  if (!workspaceId || !accountId || !providerEventId) {
    return NextResponse.json(
      {
        success: false,
        message: 'workspace_id, account_id, and provider_event_id are required',
      },
      { status: 400 },
    );
  }

  const { supabase, error } = await assertCoreWorkspaceAccess(workspaceId);
  if (error) return error;

  try {
    // Get account tokens
    const { data: tokens } = await (supabase as any)
      .schema('core')
      .from('integration_tokens')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (!tokens?.access_token || !tokens?.refresh_token) {
      return NextResponse.json(
        { success: false, message: 'No valid tokens found for account' },
        { status: 400 },
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );

    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expires_at
        ? new Date(tokens.expires_at).getTime()
        : undefined,
    });

    // Refresh token if needed
    const expiryTime = tokens.expires_at
      ? new Date(tokens.expires_at).getTime()
      : 0;
    if (Date.now() >= expiryTime - 5 * 60 * 1000) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);

      await (supabase as any)
        .schema('core')
        .from('integration_tokens')
        .update({
          access_token: credentials.access_token,
          expires_at: credentials.expiry_date
            ? new Date(credentials.expiry_date).toISOString()
            : null,
          last_refreshed_at: new Date().toISOString(),
        })
        .eq('account_id', accountId);
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: providerEventId,
      sendUpdates: 'all',
    });

    return NextResponse.json({
      success: true,
      message: 'Google meeting deleted',
    });
  } catch (err) {
    console.error('Delete Google meeting error:', err);
    const gError = err as { code?: number; message?: string };

    if (gError.code === 401) {
      return NextResponse.json(
        {
          success: false,
          message: 'Google authentication expired. Please reconnect.',
        },
        { status: 401 },
      );
    }

    // If event not found (404), consider it already deleted
    if (gError.code === 404) {
      return NextResponse.json({
        success: true,
        message: 'Google meeting already deleted',
      });
    }

    return NextResponse.json(
      { success: false, message: 'Failed to delete Google meeting' },
      { status: 500 },
    );
  }
});

// =============================================================================
// ZOOM INTEGRATION CONTROLLERS
// =============================================================================

/**
 * GET /api/core/integrations/zoom/auth
 * Initiate Zoom OAuth flow
 */
export const zoomIntegrationAuthController = catchAsync(async ({ request }) => {
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get('workspace_id');
  const returnUrl = url.searchParams.get('return_url');

  if (!workspaceId) {
    return NextResponse.json(
      { success: false, message: 'workspace_id is required' },
      { status: 400 },
    );
  }

  const { user, error } = await assertCoreWorkspaceAccess(workspaceId);
  if (error || !user) return error!;

  const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/core/integrations/zoom/callback`;

  const state = JSON.stringify({
    workspaceId,
    userId: user.id,
    returnUrl: returnUrl || '/home/meetings',
    source: 'zoom-integration',
  });

  const encodedState = Buffer.from(state).toString('base64');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.ZOOM_CLIENT_ID ?? '',
    redirect_uri: callbackUrl,
    scope: ZOOM_SCOPES.join(' '),
    state: encodedState,
  });

  const authUrl = `https://zoom.us/oauth/authorize?${params.toString()}`;

  return NextResponse.redirect(authUrl);
});

/**
 * GET /api/core/integrations/zoom/callback
 * Handle Zoom OAuth callback
 */
export const zoomIntegrationCallbackController = catchAsync(
  async ({ request }) => {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const errorParam = url.searchParams.get('error');

    const fallbackUrl = '/home/meetings?error=oauth_error';

    if (errorParam) {
      return NextResponse.redirect(new URL(fallbackUrl, request.url));
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/home/meetings?error=missing_params', request.url),
      );
    }

    let decodedState: {
      workspaceId: string;
      userId: string;
      returnUrl: string;
      source?: string;
    };

    try {
      decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    } catch {
      return NextResponse.redirect(
        new URL('/home/meetings?error=invalid_state', request.url),
      );
    }

    if (!decodedState?.workspaceId) {
      return NextResponse.redirect(
        new URL('/home/meetings?error=invalid_state', request.url),
      );
    }

    try {
      const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/core/integrations/zoom/callback`;

      // Exchange code for tokens
      const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: callbackUrl,
      });

      const axios = (await import('axios')).default;
      const tokenResponse = await axios.post(
        'https://zoom.us/oauth/token',
        tokenParams.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(
              `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`,
            ).toString('base64')}`,
          },
        },
      );

      const tokenData = tokenResponse.data;
      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token;
      const expiresIn = tokenData.expires_in;

      // Get user info from Zoom
      const userResponse = await axios.get('https://api.zoom.us/v2/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const userInfo = userResponse.data;
      if (!userInfo.email) {
        return NextResponse.redirect(
          new URL('/home/meetings?error=no_email', request.url),
        );
      }

      const supabase = getSupabaseServerClient();

      // Get or create integration connection for Zoom (per user)
      let { data: connection } = await (supabase as any)
        .schema('core')
        .from('integration_connections')
        .select('id')
        .eq('workspace_id', decodedState.workspaceId)
        .eq('provider', 'ZOOM')
        .eq('created_by', decodedState.userId)
        .eq('is_deleted', false)
        .maybeSingle();

      if (!connection) {
        const { data: newConnection, error: connError } = await (
          supabase as any
        )
          .schema('core')
          .from('integration_connections')
          .insert({
            workspace_id: decodedState.workspaceId,
            provider: 'ZOOM',
            status: 'active',
            config: {},
            created_by: decodedState.userId,
            updated_by: decodedState.userId,
          })
          .select('id')
          .single();

        if (connError) {
          console.error('Create Zoom connection error:', connError);
          return NextResponse.redirect(
            new URL('/home/meetings?error=connection_failed', request.url),
          );
        }

        connection = newConnection;
      }

      // Upsert integration account
      const { data: existingAccount } = await (supabase as any)
        .schema('core')
        .from('integration_accounts')
        .select('id')
        .eq('connection_id', connection.id)
        .eq('external_account_id', userInfo.id ?? userInfo.email)
        .eq('is_deleted', false)
        .maybeSingle();

      let account: { id: string } | null = null;
      if (existingAccount) {
        const { data: updated, error: updateErr } = await (supabase as any)
          .schema('core')
          .from('integration_accounts')
          .update({
            email: userInfo.email,
            display_name:
              `${userInfo.first_name ?? ''} ${userInfo.last_name ?? ''}`.trim() ||
              userInfo.email,
            metadata: { pic_url: userInfo.pic_url, zoom_id: userInfo.id },
            status: 'active',
            updated_by: decodedState.userId,
          })
          .eq('id', existingAccount.id)
          .select('id')
          .single();

        if (updateErr) {
          console.error('Update Zoom account error:', updateErr);
          return NextResponse.redirect(
            new URL('/home/meetings?error=account_failed', request.url),
          );
        }
        account = updated;
      } else {
        const { data: inserted, error: insertErr } = await (supabase as any)
          .schema('core')
          .from('integration_accounts')
          .insert({
            workspace_id: decodedState.workspaceId,
            connection_id: connection.id,
            external_account_id: userInfo.id ?? userInfo.email,
            email: userInfo.email,
            display_name:
              `${userInfo.first_name ?? ''} ${userInfo.last_name ?? ''}`.trim() ||
              userInfo.email,
            metadata: { pic_url: userInfo.pic_url, zoom_id: userInfo.id },
            status: 'active',
            owner_user_id: decodedState.userId,
            access_scope: 'private',
            created_by: decodedState.userId,
            updated_by: decodedState.userId,
          })
          .select('id')
          .single();

        if (insertErr) {
          console.error('Create Zoom account error:', insertErr);
          return NextResponse.redirect(
            new URL('/home/meetings?error=account_failed', request.url),
          );
        }
        account = inserted;
      }

      if (!account) {
        return NextResponse.redirect(
          new URL('/home/meetings?error=account_failed', request.url),
        );
      }

      // Upsert tokens
      const { data: existingToken } = await (supabase as any)
        .schema('core')
        .from('integration_tokens')
        .select('id')
        .eq('account_id', account!.id)
        .maybeSingle();

      const expiresAt = expiresIn
        ? new Date(Date.now() + expiresIn * 1000).toISOString()
        : null;

      let tokenError;
      if (existingToken) {
        const { error } = await (supabase as any)
          .schema('core')
          .from('integration_tokens')
          .update({
            access_token: accessToken ?? '',
            refresh_token: refreshToken ?? null,
            expires_at: expiresAt,
            token_type: tokenData.token_type ?? 'Bearer',
            scopes: ZOOM_SCOPES,
            last_refreshed_at: new Date().toISOString(),
            last_error: null,
            error_count: 0,
          })
          .eq('id', existingToken.id);
        tokenError = error;
      } else {
        const { error } = await (supabase as any)
          .schema('core')
          .from('integration_tokens')
          .insert({
            workspace_id: decodedState.workspaceId,
            account_id: account!.id,
            access_token: accessToken ?? '',
            refresh_token: refreshToken ?? null,
            expires_at: expiresAt,
            token_type: tokenData.token_type ?? 'Bearer',
            scopes: ZOOM_SCOPES,
            last_refreshed_at: new Date().toISOString(),
            last_error: null,
            error_count: 0,
          });
        tokenError = error;
      }

      if (tokenError) {
        console.error('Save Zoom tokens error:', tokenError);
        return NextResponse.redirect(
          new URL('/home/meetings?error=token_failed', request.url),
        );
      }

      const redirectUrl = decodedState.returnUrl || '/home/meetings';
      return NextResponse.redirect(
        new URL(`${redirectUrl}?connected=true`, request.url),
      );
    } catch (err) {
      console.error('Zoom integration callback error:', err);
      return NextResponse.redirect(
        new URL('/home/meetings?error=auth_failed', request.url),
      );
    }
  },
);

/**
 * Helper: Refresh Zoom tokens and return updated access token
 */
async function refreshZoomTokens(
  supabase: any,
  accountId: string,
  refreshToken: string,
): Promise<{ accessToken: string; newExpiresAt: string | null } | null> {
  try {
    const axios = (await import('axios')).default;
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const response = await axios.post(
      'https://zoom.us/oauth/token',
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`,
          ).toString('base64')}`,
        },
      },
    );

    const data = response.data;
    const newAccessToken = data.access_token;
    const newRefreshToken = data.refresh_token ?? refreshToken;
    const newExpiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null;

    // Update tokens in DB
    await supabase
      .schema('core')
      .from('integration_tokens')
      .update({
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        expires_at: newExpiresAt,
        last_refreshed_at: new Date().toISOString(),
      })
      .eq('account_id', accountId);

    return { accessToken: newAccessToken, newExpiresAt };
  } catch (err) {
    console.error('refreshZoomTokens error:', err);
    return null;
  }
}

/**
 * Helper: Get valid Zoom access token (refreshing if needed)
 */
async function getZoomAccessToken(
  supabase: any,
  accountId: string,
): Promise<string | null> {
  console.log('[getZoomAccessToken] Fetching tokens for accountId:', accountId);
  const { data: tokens, error } = await supabase
    .schema('core')
    .from('integration_tokens')
    .select('*')
    .eq('account_id', accountId)
    .single();

  if (error) {
    console.error('[getZoomAccessToken] Error fetching tokens:', error);
    return null;
  }

  console.log('[getZoomAccessToken] Tokens found:', {
    hasAccessToken: !!tokens?.access_token,
    hasRefreshToken: !!tokens?.refresh_token,
    expiresAt: tokens?.expires_at,
  });

  if (!tokens?.access_token) return null;

  const expiryTime = tokens.expires_at
    ? new Date(tokens.expires_at).getTime()
    : 0;

  console.log('[getZoomAccessToken] Token expiry check:', {
    currentTime: Date.now(),
    expiryTime,
    isExpired: Date.now() >= expiryTime - 5 * 60 * 1000,
  });

  if (Date.now() >= expiryTime - 5 * 60 * 1000) {
    console.log(
      '[getZoomAccessToken] Token expired or about to expire, refreshing...',
    );
    if (!tokens.refresh_token) {
      console.log('[getZoomAccessToken] No refresh token available');
      return null;
    }
    const refreshed = await refreshZoomTokens(
      supabase,
      accountId,
      tokens.refresh_token,
    );
    console.log('[getZoomAccessToken] Refresh result:', {
      success: !!refreshed?.accessToken,
    });
    return refreshed?.accessToken ?? null;
  }

  return tokens.access_token;
}

/**
 * POST /api/core/integrations/zoom/create-meeting
 * Create a Zoom meeting
 */
export const createZoomMeetingController = catchAsync(async ({ request }) => {
  const body = await request.json().catch(() => null);
  const workspaceId = body?.workspace_id ?? body?.workspaceId;
  const accountId = body?.account_id ?? body?.accountId;

  console.log(
    '[createZoomMeeting] Request body:',
    JSON.stringify(body, null, 2),
  );

  if (!workspaceId || !accountId) {
    console.log('[createZoomMeeting] Missing workspaceId or accountId');
    return NextResponse.json(
      { success: false, message: 'workspace_id and account_id are required' },
      { status: 400 },
    );
  }

  if (!body?.title || !body?.start_time || !body?.end_time) {
    console.log('[createZoomMeeting] Missing required fields:', {
      hasTitle: !!body?.title,
      hasStartTime: !!body?.start_time,
      hasEndTime: !!body?.end_time,
    });
    return NextResponse.json(
      {
        success: false,
        message: 'title, start_time, and end_time are required',
      },
      { status: 400 },
    );
  }

  const { supabase, error } = await assertCoreWorkspaceAccess(workspaceId);
  if (error) {
    console.log('[createZoomMeeting] Workspace access error:', error);
    return error;
  }

  try {
    console.log(
      '[createZoomMeeting] Getting Zoom access token for accountId:',
      accountId,
    );
    const accessToken = await getZoomAccessToken(supabase, accountId);
    if (!accessToken) {
      console.log(
        '[createZoomMeeting] No access token retrieved for accountId:',
        accountId,
      );
      return NextResponse.json(
        { success: false, message: 'No valid tokens found for Zoom account' },
        { status: 400 },
      );
    }
    console.log('[createZoomMeeting] Access token retrieved successfully');

    const axios = (await import('axios')).default;

    // Calculate duration in minutes
    const startTime = new Date(body.start_time);
    const endTime = new Date(body.end_time);
    const durationMinutes = Math.ceil(
      (endTime.getTime() - startTime.getTime()) / (1000 * 60),
    );

    console.log('[createZoomMeeting] Creating meeting payload:', {
      topic: body.title,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMinutes,
      timezone: body.timezone ?? 'UTC',
    });

    const meetingPayload: Record<string, unknown> = {
      topic: body.title,
      type: 2, // Scheduled meeting
      start_time: startTime.toISOString().replace(/\.\d{3}Z$/, 'Z'),
      duration: durationMinutes,
      timezone: body.timezone ?? 'UTC',
      settings: {
        join_before_host: true,
        waiting_room: false,
        mute_upon_entry: false,
        participant_video: true,
        auto_recording: 'none',
      },
    };

    if (body.description) {
      meetingPayload.agenda = body.description;
    }

    console.log('[createZoomMeeting] Sending request to Zoom API...');
    const response = await axios.post(
      'https://api.zoom.us/v2/users/me/meetings',
      meetingPayload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    console.log(
      '[createZoomMeeting] Zoom API response:',
      JSON.stringify(response.data, null, 2),
    );
    const meetingData = response.data;

    // Add registrants/attendees if provided
    console.log(
      '[createZoomMeeting] body.attendees:',
      JSON.stringify(body.attendees),
    );
    if (
      body.attendees &&
      Array.isArray(body.attendees) &&
      body.attendees.length > 0
    ) {
      for (const attendee of body.attendees) {
        try {
          await axios.post(
            `https://api.zoom.us/v2/meetings/${meetingData.id}/registrants`,
            {
              email: attendee.email,
              first_name: attendee.display_name ?? attendee.email.split('@')[0],
            },
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            },
          );
        } catch (err) {
          console.error('Zoom add registrant error (non-fatal):', err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Zoom meeting created',
      data: {
        provider_event_id: String(meetingData.id),
        provider_meeting_id: String(meetingData.id),
        meeting_url: meetingData.join_url,
      },
    });
  } catch (err) {
    console.error('Create Zoom meeting error:', err);
    const axiosErr = err as {
      response?: { status?: number };
      message?: string;
    };

    if (axiosErr.response?.status === 401) {
      return NextResponse.json(
        {
          success: false,
          message: 'Zoom authentication expired. Please reconnect.',
        },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to create Zoom meeting' },
      { status: 500 },
    );
  }
});

/**
 * POST /api/core/integrations/zoom/update-meeting
 * Update an existing Zoom meeting
 */
export const updateZoomMeetingController = catchAsync(async ({ request }) => {
  const body = await request.json().catch(() => null);
  const workspaceId = body?.workspace_id ?? body?.workspaceId;
  const accountId = body?.account_id ?? body?.accountId;

  if (!workspaceId || !accountId) {
    return NextResponse.json(
      { success: false, message: 'workspace_id and account_id are required' },
      { status: 400 },
    );
  }

  if (!body?.provider_event_id) {
    return NextResponse.json(
      { success: false, message: 'provider_event_id is required' },
      { status: 400 },
    );
  }

  const { supabase, error } = await assertCoreWorkspaceAccess(workspaceId);
  if (error) return error;

  try {
    const accessToken = await getZoomAccessToken(supabase, accountId);
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: 'No valid tokens found for Zoom account' },
        { status: 400 },
      );
    }

    const axios = (await import('axios')).default;

    const updatePayload: Record<string, unknown> = {};
    if (body.title) updatePayload.topic = body.title;
    if (body.description) updatePayload.agenda = body.description;
    if (body.timezone) updatePayload.timezone = body.timezone;

    if (body.start_time) {
      const startTime = new Date(body.start_time);
      updatePayload.start_time = startTime
        .toISOString()
        .replace(/\.\d{3}Z$/, 'Z');

      if (body.end_time) {
        const endTime = new Date(body.end_time);
        const durationMinutes = Math.ceil(
          (endTime.getTime() - startTime.getTime()) / (1000 * 60),
        );
        updatePayload.duration = durationMinutes;
      }
    }

    await axios.patch(
      `https://api.zoom.us/v2/meetings/${body.provider_event_id}`,
      updatePayload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return NextResponse.json({
      success: true,
      message: 'Zoom meeting updated',
      data: { provider_event_id: body.provider_event_id },
    });
  } catch (err) {
    console.error('Update Zoom meeting error:', err);
    const axiosErr = err as {
      response?: { status?: number };
      message?: string;
    };

    if (axiosErr.response?.status === 401) {
      return NextResponse.json(
        {
          success: false,
          message: 'Zoom authentication expired. Please reconnect.',
        },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to update Zoom meeting' },
      { status: 500 },
    );
  }
});

/**
 * POST /api/core/integrations/zoom/delete-meeting
 * Delete an existing Zoom meeting
 */
export const deleteZoomMeetingController = catchAsync(async ({ request }) => {
  const body = await request.json().catch(() => null);
  const workspaceId = body?.workspace_id ?? body?.workspaceId;
  const accountId = body?.account_id ?? body?.accountId;

  if (!workspaceId || !accountId) {
    return NextResponse.json(
      { success: false, message: 'workspace_id and account_id are required' },
      { status: 400 },
    );
  }

  if (!body?.provider_event_id) {
    return NextResponse.json(
      { success: false, message: 'provider_event_id is required' },
      { status: 400 },
    );
  }

  const { supabase, error } = await assertCoreWorkspaceAccess(workspaceId);
  if (error) return error;

  try {
    const accessToken = await getZoomAccessToken(supabase, accountId);
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: 'No valid tokens found for Zoom account' },
        { status: 400 },
      );
    }

    const axios = (await import('axios')).default;

    await axios.delete(
      `https://api.zoom.us/v2/meetings/${body.provider_event_id}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    return NextResponse.json({
      success: true,
      message: 'Zoom meeting deleted',
    });
  } catch (err) {
    console.error('Delete Zoom meeting error:', err);
    const axiosErr = err as {
      response?: { status?: number };
      message?: string;
    };

    if (axiosErr.response?.status === 401) {
      return NextResponse.json(
        {
          success: false,
          message: 'Zoom authentication expired. Please reconnect.',
        },
        { status: 401 },
      );
    }

    // 404 means already deleted - treat as success
    if (axiosErr.response?.status === 404) {
      return NextResponse.json({
        success: true,
        message: 'Zoom meeting already deleted',
      });
    }

    return NextResponse.json(
      { success: false, message: 'Failed to delete Zoom meeting' },
      { status: 500 },
    );
  }
});
