import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { requireSubscriptionManagePermission } from '~/lib/server/subscription-permissions';
import {
  getOrCreateStripeCustomer,
  getStripeClient,
} from '~/lib/stripe/stripe-client';
import { getStripePriceId } from '~/lib/stripe/stripe-price-helper';

import { catchAsync } from '../../../../utils/response-handler';

/**
 * POST /api/subscriptions/checkout-multi
 *
 * Creates a Stripe Checkout Session for MULTIPLE products at once.
 * One Stripe subscription with multiple line items (one per module).
 *
 * If the workspace already has a real Stripe subscription, new modules
 * are added to it via stripe.subscriptions.update() — no checkout needed.
 *
 * Body: { workspaceId, items: [{ productKey, seats }], billingCycle }
 */
export const createMultiProductCheckout = catchAsync(
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
    const {
      workspaceId,
      items,
      billingCycle,
    }: {
      workspaceId: string;
      items: Array<{ productKey: string; seats: number }>;
      billingCycle?: 'monthly' | 'yearly';
    } = body;

    if (!workspaceId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'workspaceId and items (non-empty array of { productKey, seats }) are required',
        },
        { status: 400 },
      );
    }

    const cycle = billingCycle || 'monthly';

    await requireSubscriptionManagePermission({
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

    // ── Validate all products and resolve Stripe price IDs ─────────
    const productKeys = items.map((i) => i.productKey);
    const { data: products, error: productsError } = await adminClient
      .from('subscription_products')
      .select(
        'id, product_key, display_name, stripe_product_id, stripe_monthly_price_id, stripe_yearly_price_id, stripe_india_monthly_price_id, stripe_india_yearly_price_id, min_seats',
      )
      .in('product_key', productKeys)
      .eq('is_active', true);

    if (productsError || !products || products.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'One or more products not found or inactive',
        },
        { status: 404 },
      );
    }

    // Build a lookup map
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const productMap = new Map<string, any>();
    for (const p of products) {
      productMap.set(p.product_key, p);
    }

    // Validate each item
    for (const item of items) {
      const product = productMap.get(item.productKey);
      if (!product) {
        return NextResponse.json(
          {
            success: false,
            message: `Product "${item.productKey}" not found or inactive`,
          },
          { status: 404 },
        );
      }

      const stripePriceId = getStripePriceId(product, billingCountry, cycle);

      if (!stripePriceId) {
        return NextResponse.json(
          {
            success: false,
            message: `No Stripe ${cycle} price configured for ${product.display_name}`,
          },
          { status: 400 },
        );
      }

      if (item.seats < (product.min_seats || 1)) {
        return NextResponse.json(
          {
            success: false,
            message: `${product.display_name} requires minimum ${product.min_seats} seats`,
          },
          { status: 400 },
        );
      }
    }

    // ── Check existing seats for this workspace ────────────────────
    const { data: existingSeats } = await adminClient
      .from('workspace_module_seats')
      .select(
        'id, product_id, status, provider_subscription_id, provider_metadata',
      )
      .eq('workspace_id', workspaceId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingSeatMap = new Map<string, any>();
    for (const seat of existingSeats || []) {
      existingSeatMap.set(seat.product_id, seat);
    }

    // Check if workspace already has a REAL, ACTIVE Stripe subscription
    // (not a trial subscription which starts with "trial_sub_",
    //  and not a cancelled subscription which can no longer be modified)
    const realStripeSeat = (existingSeats ?? []).find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s: any) =>
        s.status !== 'cancelled' &&
        s.provider_subscription_id &&
        !s.provider_subscription_id.startsWith('trial_sub_'),
    );

    // If user already has a real Stripe subscription, add new items to it
    if (realStripeSeat) {
      return await addItemsToExistingSubscription(
        adminClient,
        realStripeSeat,
        items,
        productMap,
        cycle,
        billingCountry,
        user.id,
        workspaceId,
      );
    }

    // ── Create Stripe Checkout Session with multiple line items ─────
    // Determine which items are new vs upgrading trial seats
    const lineItems: Array<{ price: string; quantity: number }> = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionMetadata: Record<string, any> = {
      workspace_id: workspaceId,
      billing_cycle: cycle,
      user_id: user.id,
      item_count: String(items.length),
    };

    items.forEach((item, idx) => {
      const product = productMap.get(item.productKey);
      const stripePriceId = getStripePriceId(product, billingCountry, cycle);

      lineItems.push({
        price: stripePriceId,
        quantity: item.seats,
      });

      // Store per-item metadata for webhook processing
      sessionMetadata[`item_${idx}_product_id`] = product.id;
      sessionMetadata[`item_${idx}_product_key`] = item.productKey;
      sessionMetadata[`item_${idx}_seats`] = String(item.seats);
    });

    // Get or create Stripe customer
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    const stripeCustomerId = await getOrCreateStripeCustomer(
      adminClient,
      workspaceId,
      authUser?.email,
      workspace?.name,
    );

    const stripe = getStripeClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: lineItems,
      metadata: sessionMetadata,
      subscription_data: {
        metadata: sessionMetadata,
      },
      success_url: `${appUrl}/org/subscription?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/org/subscription?checkout=cancel`,
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
 * Add new module items to an existing Stripe subscription.
 * Used when an already-subscribed workspace wants to add more modules.
 * No checkout session needed — Stripe handles proration.
 */
async function addItemsToExistingSubscription(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  existingSeat: any,
  items: Array<{ productKey: string; seats: number }>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  productMap: Map<string, any>,
  billingCycle: 'monthly' | 'yearly',
  billingCountry: string | null | undefined,
  userId: string,
  workspaceId: string,
) {
  const stripe = getStripeClient();
  const subscriptionId = existingSeat.provider_subscription_id;

  // Retrieve the existing subscription to get current items
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Build the items to add (new items that don't exist yet)
  const newItems: Array<{ price: string; quantity: number }> = [];
  const updateItems: Array<{ id: string; quantity: number }> = [];

  for (const item of items) {
    const product = productMap.get(item.productKey);
    const stripePriceId = getStripePriceId(product, billingCountry, billingCycle);

    // Check if this product already has an item in the subscription
    const existingItem = subscription.items.data.find(
      (si) => si.price.id === stripePriceId,
    );

    if (existingItem) {
      // Update quantity if different
      if (existingItem.quantity !== item.seats) {
        updateItems.push({ id: existingItem.id, quantity: item.seats });
      }
    } else {
      newItems.push({ price: stripePriceId, quantity: item.seats });
    }
  }

  if (newItems.length === 0 && updateItems.length === 0) {
    return NextResponse.json({
      success: true,
      message:
        'All selected modules are already subscribed with the same quantities.',
    });
  }

  // Update the subscription with new/updated items
  const allItems = [
    ...updateItems.map((i) => ({ id: i.id, quantity: i.quantity })),
    ...newItems.map((i) => ({ price: i.price, quantity: i.quantity })),
  ];

  await stripe.subscriptions.update(subscriptionId, {
    items: allItems,
    metadata: {
      ...subscription.metadata,
      updated_by: userId,
      update_reason: 'add_modules',
    },
  });

  // Create/update workspace_module_seats rows for new modules
  for (const item of items) {
    const product = productMap.get(item.productKey);

    // Check if seat already exists for this product
    const { data: existingProductSeat } = await adminClient
      .from('workspace_module_seats')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('product_id', product.id)
      .maybeSingle();

    let seatId: string;

    if (!existingProductSeat) {
      // Create new seat row for this module
      const { data: newSeat } = await adminClient
        .from('workspace_module_seats')
        .insert({
          workspace_id: workspaceId,
          product_id: product.id,
          seats_purchased: item.seats,
          seats_used: 0,
          status: 'active',
          billing_cycle: billingCycle,
          payment_provider: 'stripe',
          provider_subscription_id: subscriptionId,
          provider_metadata: {
            billing_cycle: billingCycle,
            added_via: 'subscription_update',
          },
          created_by: userId,
          updated_by: userId,
        })
        .select('id')
        .single();

      seatId = newSeat?.id;
    } else {
      // Update existing seat row
      seatId = existingProductSeat.id;
      await adminClient
        .from('workspace_module_seats')
        .update({
          seats_purchased: item.seats,
          status: 'active',
          provider_subscription_id: subscriptionId,
          updated_by: userId,
        })
        .eq('id', existingProductSeat.id);
    }

    // Auto-assign the buyer (workspace owner) to the new module
    if (seatId && userId) {
      // Check if buyer already has an active assignment for this product
      const { data: existingAssignment } = await adminClient
        .from('seat_assignments')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .eq('product_id', product.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!existingAssignment) {
        // Check for a previously revoked assignment to reactivate
        const { data: inactiveAssignment } = await adminClient
          .from('seat_assignments')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('user_id', userId)
          .eq('product_id', product.id)
          .eq('is_active', false)
          .maybeSingle();

        if (inactiveAssignment) {
          await adminClient
            .from('seat_assignments')
            .update({
              is_active: true,
              seat_id: seatId,
              assigned_at: new Date().toISOString(),
              assigned_by: userId,
              revoked_at: null,
              revoked_by: null,
            })
            .eq('id', inactiveAssignment.id);
        } else {
          // Create new assignment
          await adminClient.from('seat_assignments').insert({
            seat_id: seatId,
            workspace_id: workspaceId,
            user_id: userId,
            product_id: product.id,
            is_active: true,
            assigned_by: userId,
          });
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    message:
      'Modules added to your subscription. Prorated charges will appear on your next invoice.',
  });
}
