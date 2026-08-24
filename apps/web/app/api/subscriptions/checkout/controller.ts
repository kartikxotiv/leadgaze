import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { requireSubscriptionBillingPermission } from '~/lib/server/subscription-permissions';
import {
  getOrCreateStripeCustomer,
  getStripeClient,
} from '~/lib/stripe/stripe-client';
import { getStripePriceId } from '~/lib/stripe/stripe-price-helper';
import {
  type RouteUser,
  parseJson,
  requireRouteUser,
  success,
} from '~/lib/subscriptions/api';
import { pricingCheckoutRequestSchema } from '~/lib/subscriptions/contracts';
import { createSubscriptionService } from '~/lib/subscriptions/service';

import { catchAsync } from '../../../../utils/response-handler';

/**
 * POST /api/subscriptions/checkout
 *
 * Creates a Stripe Checkout Session for a new module subscription.
 * Returns the checkout URL for the frontend to redirect to.
 *
 * Body: { workspaceId, productKey, seats, billingCycle }
 */
export const createCheckoutSession = catchAsync(
  async ({
    request,
    user,
  }: {
    request: NextRequest;
    user?: { id: string };
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminClient = getSupabaseServerAdminClient() as any;
    const supabase = getSupabaseServerClient();

    if (!user) {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        return NextResponse.json(
          { success: false, message: 'Unauthorized' },
          { status: 401 },
        );
      }
      user = authUser;
    }

    const body = await request.clone().json();
    const { workspaceId, productKey, seats, billingCycle, returnUrl } = body;

    if (!workspaceId || !productKey || !seats || seats < 1) {
      return NextResponse.json(
        {
          success: false,
          message: 'workspaceId, productKey, and seats (>= 1) are required',
        },
        { status: 400 },
      );
    }

    const cycle = billingCycle || 'monthly';

    await requireSubscriptionBillingPermission({
      accountId: user.id,
      workspaceId,
    });

    // ── Fetch workspace and billing country ──────────────────────────
    const { data: workspace } = await adminClient
      .from('workspaces')
      .select('name, company_id')
      .eq('id', workspaceId)
      .single();

    let billingCountry: string | null = null;
    if (workspace?.company_id) {
      const { data: company } = await adminClient
        .from('companies')
        .select('billing_country')
        .eq('id', workspace?.company_id)
        .single();
      if (company?.billing_country) {
        billingCountry = company.billing_country;
      }
    }

    // ── Resolve product and Stripe price ID ──────────────────────────
    const { data: product, error: productError } = await adminClient
      .from('subscription_products')
      .select('*')
      .eq('product_key', productKey)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { success: false, message: 'Product not found or inactive' },
        { status: 404 },
      );
    }

    // Resolve the Stripe price ID based on billing cycle and country
    const stripePriceId = getStripePriceId(product, billingCountry, cycle);

    if (!stripePriceId) {
      return NextResponse.json(
        {
          success: false,
          message: `No Stripe ${cycle} price configured for ${product.display_name}. Please contact support.`,
        },
        { status: 400 },
      );
    }

    // ── Check for existing active subscription (upgrade flow) ───────
    const { data: existingSeat } = await adminClient
      .from('workspace_module_seats')
      .select('id, status, seats_purchased, provider_subscription_id')
      .eq('workspace_id', workspaceId)
      .eq('product_id', product.id)
      .in('status', ['active', 'trialing'])
      .maybeSingle();

    if (existingSeat?.provider_subscription_id) {
      // If the user already has a Stripe subscription for this product,
      // they should use the update-seats endpoint instead of creating a new checkout.
      return NextResponse.json(
        {
          success: false,
          message: `You already have an active ${product.display_name} subscription. Use the seat update feature to change quantity.`,
          existingSeatId: existingSeat.id,
        },
        { status: 400 },
      );
    }

    // ── Get or create Stripe customer ───────────────────────────────
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    const stripeCustomerId = await getOrCreateStripeCustomer(
      adminClient,
      workspaceId,
      authUser?.email,
      workspace?.name,
    );

    // ── Build Stripe Checkout Session ───────────────────────────────
    const stripe = getStripeClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    let basePath = '/org/subscription';
    let extraParams = '';
    if (
      returnUrl &&
      typeof returnUrl === 'string' &&
      returnUrl.startsWith('/')
    ) {
      const parts = returnUrl.split('?');
      basePath = parts[0] || '/org/subscription';
      if (parts[1]) {
        const search = new URLSearchParams(parts[1]);
        search.delete('checkout');
        search.delete('session_id');
        const paramStr = search.toString();
        if (paramStr) {
          extraParams = `&${paramStr}`;
        }
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePriceId,
          quantity: seats,
        },
      ],
      metadata: {
        workspace_id: workspaceId,
        product_key: productKey,
        product_id: product.id,
        billing_cycle: cycle,
        user_id: user.id,
      },
      subscription_data: {
        metadata: {
          workspace_id: workspaceId,
          product_key: productKey,
          product_id: product.id,
          billing_cycle: cycle,
          user_id: user.id,
        },
      },
      success_url: `${appUrl}${basePath}?checkout=success&session_id={CHECKOUT_SESSION_ID}${extraParams}`,
      cancel_url: `${appUrl}${basePath}?checkout=cancel${extraParams}`,
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json(
        { success: false, message: 'Failed to create checkout session' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        url: session.url,
        sessionId: session.id,
      },
    });
  },
);

/**
 * Dispatches plan-aware pricing checkout requests to the new subscription
 * model while preserving the legacy product/seat checkout contract.
 */
export const createCompatibleCheckoutSession = catchAsync(
  async (params: { request: NextRequest; user?: RouteUser }) => {
    const candidate = await params.request
      .clone()
      .json()
      .catch(() => null);
    if (
      candidate &&
      typeof candidate === 'object' &&
      'moduleKey' in candidate &&
      'planKey' in candidate
    ) {
      const actor = requireRouteUser(params.user);
      const input = await parseJson(
        params.request.clone(),
        pricingCheckoutRequestSchema,
      );
      await requireSubscriptionBillingPermission({
        accountId: actor.id,
        workspaceId: input.workspaceId,
      });
      const service = createSubscriptionService(
        getSupabaseServerAdminClient() as never,
      );
      return success(await service.createCheckout(input, actor));
    }
    return createCheckoutSession(params);
  },
);
