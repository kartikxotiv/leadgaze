import { NextRequest } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { handleFormOptions, handleGetForm } from '@kit/integration-website';

export async function OPTIONS() {
  return handleFormOptions();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const formId = resolvedParams.id;
  const supabase = getSupabaseServerAdminClient();

  return handleGetForm(request, formId, supabase);
}
