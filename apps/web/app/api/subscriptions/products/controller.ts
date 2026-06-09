import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { catchAsync } from '../../../../utils/response-handler';

/**
 * GET /api/subscriptions/products
 * Returns all active subscription products with their module mappings.
 */
export const getProducts = catchAsync(
  async ({ request: _request }: { request: NextRequest }) => {
    const adminClient = getSupabaseServerAdminClient();

    const { data: products, error } = await adminClient
      .from('subscription_products')
      .select(
        `
      *,
      product_module_map (
        crm_module_id,
        access_mode,
        crm_modules (
          module_key,
          module_name
        )
      )
    `,
      )
      .eq('is_active', true)
      .order('display_name');

    if (error) {
      console.error('Get products error:', error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data: products || [] });
  },
);
