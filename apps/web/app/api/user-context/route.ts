import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getUserContext } from '~/lib/server/get-user-context';

function getCorsHeaders(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:8000';

  const isAllowedOrigin =
    origin === adminUrl ||
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:');

  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : adminUrl,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request),
  });
}

export async function GET(request: NextRequest) {
  const headers = getCorsHeaders(request);
  try {
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 200, headers },
      );
    }

    const ctx = await getUserContext();

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          id: user.id,
          sub: user.id,
          email: user.email,
          user_metadata: user.user_metadata,
        },
        context: ctx,
      },
      { status: 200, headers },
    );
  } catch (err) {
    return NextResponse.json(
      { authenticated: false, user: null, error: String(err) },
      { status: 200, headers },
    );
  }
}
