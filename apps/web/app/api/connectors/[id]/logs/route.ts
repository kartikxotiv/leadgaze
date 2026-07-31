import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { enhanceRouteHandler } from '@kit/next/routes';
import { catchAsync, successDataResponse } from '~/utils/response-handler';

export const GET = enhanceRouteHandler(
  catchAsync(async ({ params }: { request: NextRequest; params?: Record<string, string> }) => {
    const supabase = getSupabaseServerClient() as any;
    const id = params?.id; // Connector ID

    const { data, error } = await supabase
      .schema('core')
      .from('connector_logs')
      .select(`
        *,
        event:event_id (source, raw_payload, normalized_payload)
      `)
      .eq('connector_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return successDataResponse('Logs retrieved successfully', data || []);
  }),
  { auth: true }
);
