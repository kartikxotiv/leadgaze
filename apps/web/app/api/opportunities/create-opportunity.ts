import { NextRequest, NextResponse } from 'next/server';

import { buildOpportunityCurrencyFields } from '@kit/shared/currency';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { createEntitlementService } from '~/lib/entitlements';

import {
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';

export const createOpportunity = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    const supabase = getSupabaseServerClient();
    const body = await request.json();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const {
      opportunity_name,
      account_id,
      stage_id,
      workspace_id,
      amount,
      currency: currency_original,
      expected_close_date,
      probability,
      priority,
      opportunity_type,
      lead_source,
      description,
      competitor,
    } = body;

    if (!opportunity_name || !account_id || !stage_id || !workspace_id) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 },
      );
    }

    // =====================================================
    // MULTI-CURRENCY: Resolve base_amount_usd
    // =====================================================
    let currencyFields = {};
    const oppCurrency = currency_original || 'USD';
    const oppAmount = amount || 0;

    if (oppAmount && oppCurrency) {
      try {
        // Fetch latest exchange rate for USD -> oppCurrency
        const adminClient = getSupabaseServerAdminClient();
        const { data: rates } = await adminClient
          .schema('core')
          .from('currency_exchange_rates')
          .select('*')
          .eq('base_currency', 'USD')
          .eq('target_currency', oppCurrency.toUpperCase())
          .order('fetched_at', { ascending: false })
          .limit(1);

        if (rates && rates.length > 0) {
          const rate = rates[0]!;
          currencyFields = buildOpportunityCurrencyFields({
            amount: oppAmount,
            currency: oppCurrency,
            exchangeRateToUsd: rate.exchange_rate,
            rateDate: rate.fetched_at.split('T')[0]!,
          });
        }
      } catch (rateError) {
        console.error('Failed to fetch exchange rate:', rateError);
        // Proceed without base_amount_usd if rate fetch fails
      }
    }

    const entitlements = createEntitlementService();
    const opportunity = await entitlements.withUsageReservation(
      {
        workspaceId: workspace_id,
        moduleKey: 'sales',
        featureKey: 'sales.opportunities',
        resourceType: 'opportunity',
      },
      async () => {
        const { data, error } = await supabase
          .from('crm_opportunities')
          .insert({
            workspace_id,
            account_id,
            stage_id,
            opportunity_name,
            amount: oppAmount,
            currency: oppCurrency,
            expected_close_date: expected_close_date || null,
            probability: probability || null,
            priority: priority || null,
            opportunity_type: opportunity_type || null,
            lead_source: lead_source || null,
            description: description || null,
            competitor: competitor || null,
            owner_id: user.id,
            created_by: user.id,
            ...currencyFields,
          })
          .select()
          .single();

        if (error) {
          console.error('Create opportunity error:', error);
          throw error;
        }
        return data;
      },
      (created) => ({ resourceId: created.id }),
    );

    return successDataResponse('Opportunity created successfully', opportunity);
  },
);

/**
 * POST /api/opportunities/statuses
 * Create a new opportunity stage
 */
