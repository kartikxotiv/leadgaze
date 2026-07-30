import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { enhanceRouteHandler } from '@kit/next/routes';
import { catchAsync } from '~/utils/response-handler';

export const POST = enhanceRouteHandler(
  catchAsync(async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const connectorId = params?.id;
    if (!connectorId) {
      return NextResponse.json({ success: false, message: 'Connector ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient() as any;

    // Generate new credentials
    const randHex = () => Math.random().toString(16).substring(2, 10);
    const pubKey = `pk_live_${randHex()}${randHex()}`;
    const secretRaw = `sk_live_${randHex()}${randHex()}${randHex()}`;
    const masked = `${secretRaw.substring(0, 12)}...${secretRaw.substring(secretRaw.length - 4)}`;

    const { data: updatedKey, error } = await supabase
      .schema('core')
      .from('connector_api_keys')
      .update({
        public_key: pubKey,
        hashed_secret_key: secretRaw,
        masked_secret_key: masked,
        updated_at: new Date().toISOString()
      })
      .eq('connector_id', connectorId)
      .select()
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: {
        publicKey: pubKey,
        secretKey: secretRaw,
        record: updatedKey
      }
    });
  }),
  { auth: true }
);
