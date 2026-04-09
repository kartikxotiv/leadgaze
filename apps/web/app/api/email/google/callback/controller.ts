import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { catchAsync } from '~/utils/response-handler';
import { getWorkspaceMemberContext } from '~/lib/email/email-account-access';

export const googleAuthCallback = catchAsync(
    async ({
        request,
    }: {
        request: NextRequest;
        params?: Record<string, string>;
    }) => {
        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');


        if (error) {
            return NextResponse.redirect(
                new URL('/home/workspace-settings?error=oauth_error', request.url)
            );
        }

        if (!code || !state) {
            return NextResponse.redirect(
                new URL('/home/workspace-settings?error=missing_params', request.url)
            );
        }

        let workspaceId: string;
        let returnUrl: string;
        let fromName: string;
        let accessScope: string | null;

        try {
            const decodedState = JSON.parse(
                Buffer.from(state, 'base64').toString('utf-8')
            );
            workspaceId = decodedState.workspaceId;
            returnUrl = decodedState.returnUrl;
            fromName = decodedState.fromName;
            accessScope = decodedState.accessScope || null;
        } catch (e) {
            return NextResponse.redirect(
                new URL('/home/workspace-settings?error=invalid_state', request.url)
            );
        }

        try {
            const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                `${process.env.NEXT_PUBLIC_SITE_URL}/api/email/google/callback`
            );

            const { tokens } = await oauth2Client.getToken(code);
            oauth2Client.setCredentials(tokens);

            // Get user profile
            const oauth2 = google.oauth2({
                auth: oauth2Client,
                version: 'v2',
            });

            const { data: userInfo } = await oauth2.userinfo.get();

            if (!userInfo.email) {
                throw new Error('No email found in user info');
            }

            const supabase = getSupabaseServerClient();
            const memberContext = await getWorkspaceMemberContext(supabase, workspaceId);

            if (!memberContext) {
                return NextResponse.redirect(
                    new URL('/home/workspace-settings?error=auth_failed', request.url)
                );
            }

            const sanitizedAccessScope =
                memberContext.isAdmin && accessScope === 'workspace'
                    ? 'workspace'
                    : 'private';

            // Save to database
            const { error: dbError } = await supabase.from('email_accounts').upsert(
                {
                    workspace_id: workspaceId,
                    email: userInfo.email,
                    from_name: fromName,
                    provider: 'google',
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token, // This might be undefined if not first time/prompt not forced
                    expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
                    is_active: true,
                    is_sync_enabled: true,
                    owner_user_id: memberContext.userId,
                    access_scope: sanitizedAccessScope,
                } as any,
                {
                    onConflict: 'workspace_id,email',
                }
            );

            if (dbError) {
                return NextResponse.redirect(
                    new URL('/home/workspace-settings?error=db_error', request.url)
                );
            }

            return NextResponse.redirect(new URL(returnUrl, request.url));

        } catch (e) {
            return NextResponse.redirect(
                new URL('/home/workspace-settings?error=auth_failed', request.url)
            );
        }
    }
)
