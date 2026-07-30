import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { createMiddlewareClient } from '@kit/supabase/middleware-client';

import { endImpersonation } from '../controller';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> },
) {
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

  const params = await context.params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return endImpersonation({ request, params, user: user as any });
}
