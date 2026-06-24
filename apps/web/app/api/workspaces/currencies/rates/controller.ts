import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

// =====================================================
// GET /api/workspaces/currencies/rates?base=USD&target=INR
// =====================================================

export const getExchangeRates = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    const supabase = getSupabaseServerClient() as any;
    const { searchParams } = new URL(request.url);
    const base = searchParams.get('base');
    const target = searchParams.get('target');

    if (!base || !target) {
      return NextResponse.json(
        { message: 'base and target currency codes are required' },
        { status: 400 },
      );
    }

    // Get the latest rate for the pair
    const { data, error } = await supabase
      .from('currency_exchange_rates')
      .select('*')
      .eq('base_currency', base.toUpperCase())
      .eq('target_currency', target.toUpperCase())
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { message: `No exchange rate found for ${base} -> ${target}` },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { message: 'Failed to fetch exchange rate' },
        { status: 500 },
      );
    }

    return successDataResponse(data);
  },
);

// =====================================================
// GET /api/workspaces/currencies/rates/all?base=USD
// Returns all latest rates for a given base currency
// =====================================================

export const getAllExchangeRates = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    const supabase = getSupabaseServerClient() as any;
    const { searchParams } = new URL(request.url);
    const base = searchParams.get('base');

    if (!base) {
      return NextResponse.json(
        { message: 'base currency code is required' },
        { status: 400 },
      );
    }

    // Use a lateral join to get the latest rate per target currency
    const { data, error } = await supabase
      .from('currency_exchange_rates')
      .select('*')
      .eq('base_currency', base.toUpperCase())
      .order('fetched_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { message: 'Failed to fetch exchange rates' },
        { status: 500 },
      );
    }

    // Deduplicate to latest rate per target currency
    const latestByTarget = new Map<string, (typeof data)[0]>();
    for (const rate of data || []) {
      if (!latestByTarget.has(rate.target_currency)) {
        latestByTarget.set(rate.target_currency, rate);
      }
    }

    return successDataResponse(Array.from(latestByTarget.values()));
  },
);
