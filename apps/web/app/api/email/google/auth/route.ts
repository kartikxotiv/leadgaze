import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspace_id');
    const returnUrl = searchParams.get('return_url');
    const fromName = searchParams.get('from_name');

    if (!workspaceId) {
        return NextResponse.json(
            { error: 'Missing workspace_id' },
            { status: 400 }
        );
    }

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/email/google/callback`
    );

    const state = JSON.stringify({
        workspaceId,
        fromName,
        returnUrl: returnUrl || '/home/workspace-settings',
    });

    // Encode state to base64 to avoid issues with special characters
    const encodedState = Buffer.from(state).toString('base64');

    const scopes = [
        'https://mail.google.com/',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
    ];

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        state: encodedState,
        prompt: 'consent', // Force consent to ensure we get a refresh token
    });

    return NextResponse.redirect(url);
}
