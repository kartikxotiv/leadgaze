import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
// import { getLogger } from '@kit/shared/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // const logger = getLogger();

    if (error) {
        // logger.error({ error }, 'Google OAuth error');
        return NextResponse.redirect(
            new URL('/home/workspace-settings?error=oauth_error', req.url)
        );
    }

    if (!code || !state) {
        return NextResponse.redirect(
            new URL('/home/workspace-settings?error=missing_params', req.url)
        );
    }

    let workspaceId: string;
    let returnUrl: string;
    let fromName: string;

    try {
        const decodedState = JSON.parse(
            Buffer.from(state, 'base64').toString('utf-8')
        );
        workspaceId = decodedState.workspaceId;
        returnUrl = decodedState.returnUrl;
        fromName = decodedState.fromName;
    } catch (e) {
        // logger.error({ e }, 'Failed to parse state');
        return NextResponse.redirect(
            new URL('/home/workspace-settings?error=invalid_state', req.url)
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
            },
            {
                onConflict: 'workspace_id, email',
            }
        );

        if (dbError) {
            // logger.error({ dbError }, 'Failed to save email account');
            return NextResponse.redirect(
                new URL('/home/workspace-settings?error=db_error', req.url)
            );
        }

        return NextResponse.redirect(new URL(returnUrl, req.url));

    } catch (e) {
        // logger.error({ e }, 'Google OAuth callback failed');
        return NextResponse.redirect(
            new URL('/home/workspace-settings?error=auth_failed', req.url)
        );
    }
}
