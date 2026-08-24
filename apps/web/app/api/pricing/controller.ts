import type { NextRequest } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { success } from '~/lib/subscriptions/api';
import { createSubscriptionService } from '~/lib/subscriptions/service';
import { catchAsync } from '~/utils/response-handler';

export const getPublicPricing = catchAsync(
  async ({ request: _request }: { request: NextRequest }) => {
    const service = createSubscriptionService(
      getSupabaseServerAdminClient() as never,
    );
    return success(await service.getPublicPricing());
  },
);
