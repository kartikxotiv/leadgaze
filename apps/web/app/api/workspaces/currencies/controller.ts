import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

// =====================================================
// GET /api/workspaces/currencies?workspaceId=xxx
// =====================================================

export const getWorkspaceCurrencies = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    const supabase = getSupabaseServerClient() as any;
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
    .schema('core')
      .from('workspace_currencies')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('currency_code', { ascending: true });

    if (error) {
      console.log({error})
      return NextResponse.json(
        { message: 'Failed to fetch currencies' },
        { status: 500 },
      );
    }

    return successDataResponse(data || []);
  },
);

// =====================================================
// POST /api/workspaces/currencies
// =====================================================

export const addWorkspaceCurrency = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    const supabase = getSupabaseServerClient() as any;
    const body = await request.json();

    const { workspace_id, currency_code, currency_symbol, is_default } = body;

    if (!workspace_id || !currency_code || !currency_symbol) {
      return NextResponse.json(
        { message: 'workspace_id, currency_code, and currency_symbol are required' },
        { status: 400 },
      );
    }

    // If setting as default, unset other defaults first
    if (is_default) {
      await supabase
      .schema('core')
        .from('workspace_currencies')
        .update({ is_default: false })
        .eq('workspace_id', workspace_id);
    }

    const { data, error } = await supabase
    .schema('core')
      .from('workspace_currencies')
      .insert({
        workspace_id,
        currency_code: currency_code.toUpperCase(),
        currency_symbol,
        is_default: is_default ?? false,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { message: `Currency ${currency_code} is already enabled for this workspace` },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { message: 'Failed to add currency' },
        { status: 500 },
      );
    }

    return successDataResponse(data, null);
  },
);

// =====================================================
// PATCH /api/workspaces/currencies/:id
// =====================================================

export const updateWorkspaceCurrency = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient() as any;
    const currencyId = params?.id;
    const body = await request.json();

    if (!currencyId) {
      return NextResponse.json(
        { message: 'Currency ID is required' },
        { status: 400 },
      );
    }

    const { is_default, is_active, currency_symbol } = body;

    // If setting as default, unset other defaults in the same workspace
    if (is_default) {
      // First get the workspace_id for this currency
      const { data: currency } = await supabase
      .schema('core')
        .from('workspace_currencies')
        .select('workspace_id, currency_code')
        .eq('id', currencyId)
        .single();

      if (currency) {
        await supabase
        .schema('core')
          .from('workspace_currencies')
          .update({ is_default: false })
          .eq('workspace_id', currency.workspace_id)
          .neq('id', currencyId);

        // Also update workspace_preferences
        await supabase
          .schema('core')
          .from('workspace_preferences')
          .upsert(
            {
              workspace_id: currency.workspace_id,
              default_currency: currency.currency_code,
            },
            { onConflict: 'workspace_id' },
          );
      }
    }

    const payload: Record<string, unknown> = {};
    if (is_default !== undefined) payload.is_default = is_default;
    if (is_active !== undefined) payload.is_active = is_active;
    if (currency_symbol !== undefined) payload.currency_symbol = currency_symbol;

    const { data, error } = await supabase
    .schema('core')
      .from('workspace_currencies')
      .update(payload)
      .eq('id', currencyId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { message: 'Failed to update currency' },
        { status: 500 },
      );
    }

    return successDataResponse(data, null);
  },
);

// =====================================================
// DELETE /api/workspaces/currencies/:id
// =====================================================

export const deleteWorkspaceCurrency = catchAsync(
  async ({ params }: { request?: NextRequest; params?: Record<string, string> }) => {
    const supabase = getSupabaseServerClient() as any;
    const currencyId = params?.id;

    if (!currencyId) {
      return NextResponse.json(
        { message: 'Currency ID is required' },
        { status: 400 },
      );
    }

    const { error } = await supabase
    .schema('core')
      .from('workspace_currencies')
      .delete()
      .eq('id', currencyId);

    if (error) {
      return NextResponse.json(
        { message: 'Failed to delete currency' },
        { status: 500 },
      );
    }

    return successDataResponse('Currency removed successfully');
  },
);
