import { NextRequest } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import {
  handleSubmitOptions,
  handleFormSubmit,
  processWebsiteSubmission,
} from '@kit/integration-website';

export async function OPTIONS() {
  return handleSubmitOptions();
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServerAdminClient();
  const publicKey = request.headers.get('X-Connector-Public-Key');

  return handleFormSubmit(request, publicKey, processWebsiteSubmission, supabase);
}
