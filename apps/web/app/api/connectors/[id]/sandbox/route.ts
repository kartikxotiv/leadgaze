import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { enhanceRouteHandler } from '@kit/next/routes';
import { processWebsiteSubmission } from '@kit/integration-website';
import type { WebsiteSubmitInput } from '@kit/integration-website';
import { catchAsync, successDataResponse } from '~/utils/response-handler';

export const POST = enhanceRouteHandler(
  catchAsync(
    async ({
      request,
      params,
    }: {
      request: NextRequest;
      params?: Record<string, string>;
    }) => {
      const supabase = getSupabaseServerClient() as any;
      const adminSupabase = getSupabaseServerAdminClient() as any;
      const id = params?.id; // Connector ID

      const body = await request.json();
      const { payload, workspace_id } = body as {
        payload: WebsiteSubmitInput;
        workspace_id: string;
      };

      // Verify the requesting user is authenticated
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }

      // Fetch the connector (admin client bypasses RLS for sandbox usage)
      const { data: connector, error: connErr } = await adminSupabase
        .schema('core')
        .from('connectors')
        .select('*')
        .eq('id', id)
        .single();

      if (connErr) throw connErr;

      // Delegate all ingestion logic to the package
      await processWebsiteSubmission(adminSupabase, {
        connector,
        workspace_id,
        raw_payload: payload,
        source: 'sandbox',
      });

      return successDataResponse('Sandbox test processed successfully');
    }
  ),
  { auth: true }
);
