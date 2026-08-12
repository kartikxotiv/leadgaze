import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { createMiddlewareClient } from '@kit/supabase/middleware-client';

import { startImpersonation } from './controller';

export async function POST(request: NextRequest) {
  const dummyRes = new NextResponse();
  const supabase = createMiddlewareClient(request, dummyRes);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Admin session not found' },
      { status: 401 },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return startImpersonation({ request, user: user as any });
}
