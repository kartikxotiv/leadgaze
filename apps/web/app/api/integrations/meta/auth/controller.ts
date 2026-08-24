import { NextRequest, NextResponse } from 'next/server';

import { buildMetaAdsOAuthUrl } from '@kit/integration-meta-ads';
import { buildWhatsAppOAuthUrl } from '@kit/integration-whatsapp';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { createEntitlementService } from '~/lib/entitlements';
import { catchAsync } from '~/utils/response-handler';

export const dynamic = 'force-dynamic';

export const metaAdsAuth = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspace_id');
    const type = searchParams.get('type') ?? 'ads'; // 'ads' or 'whatsapp'

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: 'Missing workspace_id' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (type === 'ads') {
      await createEntitlementService().requireBooleanFeature(
        workspaceId,
        'sales',
        'sales.meta_ads',
      );
    }

    const returnUrl =
      type === 'whatsapp'
        ? `/home/sales/workspace-settings/integrations/whatsapp`
        : `/home/sales/workspace-settings/integrations/meta-ads`;

    const state = Buffer.from(
      JSON.stringify({
        workspaceId,
        userId: user?.id ?? '',
        returnUrl,
        type,
      }),
    ).toString('base64');

    const url =
      type === 'whatsapp'
        ? buildWhatsAppOAuthUrl(state)
        : buildMetaAdsOAuthUrl(state);

    return NextResponse.redirect(url);
  },
);
