import { NextRequest } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { handleZapierOptions, handleZapierSubmit } from '@kit/integration-zapier';

export async function OPTIONS() {
  return handleZapierOptions();
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServerAdminClient();
  const apiKey = request.headers.get('X-Zapier-Api-Key');

  return handleZapierSubmit(request, apiKey, supabase);
}
