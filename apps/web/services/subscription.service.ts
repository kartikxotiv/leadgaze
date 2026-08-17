import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

// ─── Types ───────────────────────────────────────────────────────

export interface SubscriptionProduct {
  id: string;
  product_key: string;
  display_name: string;
  monthly_price_per_seat: number | null;
  yearly_price_per_seat: number | null;
  india_monthly_price_per_seat: number | null;
  india_yearly_price_per_seat: number | null;
  currency: string;
  min_seats: number;
  is_active: boolean;
  is_public: boolean;
  description: string | null;
  product_module_map?: Array<{
    crm_module_id: string;
    access_mode: string;
    crm_modules?: { module_key: string; module_name: string };
  }>;
}

export interface WorkspaceSeat {
  id: string;
  workspace_id: string;
  product_id: string;
  seats_purchased: number;
  seats_used: number;
  status: string;
  billing_cycle: string;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  payment_provider: string;
  provider_subscription_id: string | null;
  provider_metadata: Record<string, unknown> | null;
  subscription_products?: {
    id: string;
    product_key: string;
    display_name: string;
    monthly_price_per_seat: number | null;
    yearly_price_per_seat: number | null;
    currency: string;
  };
}

export interface SeatAssignment {
  id: string;
  seat_id: string;
  workspace_id: string;
  user_id: string;
  product_id: string;
  is_active: boolean;
  assigned_at: string;
  revoked_at: string | null;
  accounts?: {
    id: string;
    email: string;
    name: string | null;
    picture_url: string | null;
  };
  subscription_products?: {
    id: string;
    product_key: string;
    display_name: string;
  };
  workspace_module_seats?: {
    id: string;
    seats_purchased: number;
    seats_used: number;
    status: string;
  };
}

export interface EnabledModule {
  module_id: string;
  module_key: string;
  module_name: string;
  purchased_seats: number;
  used_seats: number;
  subscription_status: string;
}

export interface WorkspaceSubscriptionStatus {
  enabled_modules: EnabledModule[];
  subscription: {
    status: string;
    billing_cycle: string;
    current_period_end: string | null;
  } | null;
  is_subscription_valid: boolean;
  is_trial_expired: boolean;
  trial_days_remaining: number | null;
}

export interface CheckoutPayload {
  workspaceId: string;
  productKey: string;
  seats?: number;
  billingCycle?: 'monthly' | 'yearly';
  returnUrl?: string;
}

export interface CheckoutItem {
  productKey: string;
  seats: number;
}

export interface MultiCheckoutPayload {
  workspaceId: string;
  items: CheckoutItem[];
  billingCycle?: 'monthly' | 'yearly';
  returnUrl?: string;
}

export interface CheckoutResponse {
  success: boolean;
  data: {
    url: string;
    sessionId: string;
  };
}

export interface CancelPayload {
  workspaceId: string;
  productKey?: string;
}

export interface CancelResponse {
  success: boolean;
  message: string;
  fullCancellation: boolean;
}

export interface AssignSeatPayload {
  workspaceId: string;
  userId: string;
  productKey: string;
}

export interface ModuleEntitlement {
  id: string;
  product_id: string;
  entitlement_type: string;
  granted_seats: number | null;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  reason: string;
}

// ─── Services ────────────────────────────────────────────────────

const getSubscriptionProductsService = asyncHandlerClient(async () => {
  const response = await ApiClient.get('/subscriptions/products');
  return response.data;
});

const getWorkspaceSeatsService = asyncHandlerClient(
  async (workspaceId: string) => {
    const response = await ApiClient.get(
      `/subscriptions/workspace-seats?workspaceId=${workspaceId}`,
    );
    return response.data;
  },
);

/**
 * Creates a Stripe Checkout session for multiple products at once.
 * One Stripe subscription with multiple line items.
 */
const createMultiProductCheckoutService = asyncHandlerClient(
  async (payload: MultiCheckoutPayload): Promise<CheckoutResponse> => {
    const response = await ApiClient.post(
      '/subscriptions/checkout-multi',
      payload,
    );
    return response.data;
  },
);

/**
 * Creates a Stripe Checkout session for a single module subscription.
 * @deprecated Use createMultiProductCheckoutService instead.
 */
const createCheckoutSessionService = asyncHandlerClient(
  async (payload: CheckoutPayload): Promise<CheckoutResponse> => {
    const response = await ApiClient.post('/subscriptions/checkout', payload);
    return response.data;
  },
);

/**
 * Legacy dummy checkout (kept for backward compatibility during migration).
 * @deprecated Use createCheckoutSessionService instead.
 */
const subscribeToProductService = asyncHandlerClient(
  async (payload: CheckoutPayload) => {
    const response = await ApiClient.post(
      '/subscriptions/dummy-checkout',
      payload,
    );
    return response.data;
  },
);

/**
 * Updates seat count via Stripe (prorated).
 * Primary method for seat quantity changes.
 */
const updateSeatsViaStripeService = asyncHandlerClient(
  async (seatId: string, newQuantity: number) => {
    const response = await ApiClient.post('/subscriptions/update-seats', {
      seatId,
      newQuantity,
    });
    return response.data;
  },
);

/**
 * Updates seat count directly in the database.
 * Fallback for manual/non-Stripe subscriptions.
 * @deprecated Use updateSeatsViaStripeService for Stripe subscriptions.
 */
const updateSeatCountService = asyncHandlerClient(
  async (seatId: string, seatsPurchased: number) => {
    const response = await ApiClient.put('/subscriptions/workspace-seats', {
      seatId,
      seatsPurchased,
    });
    return response.data;
  },
);

const getSeatAssignmentsService = asyncHandlerClient(
  async (workspaceId: string, productKey?: string) => {
    const params = new URLSearchParams({ workspaceId });
    if (productKey) params.set('productKey', productKey);
    const response = await ApiClient.get(
      `/subscriptions/seat-assignments?${params.toString()}`,
    );
    return response.data;
  },
);

const assignSeatService = asyncHandlerClient(
  async (payload: AssignSeatPayload) => {
    const response = await ApiClient.post(
      '/subscriptions/seat-assignments',
      payload,
    );
    return response.data;
  },
);

const revokeSeatService = asyncHandlerClient(async (assignmentId: string) => {
  const response = await ApiClient.delete(
    `/subscriptions/seat-assignments?id=${assignmentId}`,
  );
  return response.data;
});

/**
 * Cancels the entire subscription or removes a single module.
 * Syncs with Stripe — either cancels the subscription or removes a line item.
 */
const cancelSubscriptionService = asyncHandlerClient(
  async (payload: CancelPayload): Promise<CancelResponse> => {
    const response = await ApiClient.post('/subscriptions/cancel', payload);
    return response.data;
  },
);

const getWorkspaceSubscriptionStatus = asyncHandlerClient(
  async (workspaceId: string) => {
    const response = await ApiClient.get(
      `/subscriptions/workspace-status?workspaceId=${workspaceId}`,
    );
    return response.data.data;
  },
);

const checkProductAccessService = asyncHandlerClient(
  async (workspaceId: string, productKey: string) => {
    const response = await ApiClient.get(
      `/subscriptions/check-access?workspaceId=${workspaceId}&productKey=${productKey}`,
    );
    return response.data;
  },
);

/**
 * Fetches active entitlements for a workspace (free access grants).
 */
const getWorkspaceEntitlementsService = asyncHandlerClient(
  async (workspaceId: string): Promise<{ data: ModuleEntitlement[] }> => {
    const response = await ApiClient.get(
      `/subscriptions/entitlements?workspaceId=${workspaceId}`,
    );
    return response.data;
  },
);

// Alias used by org/home page (imported from @kit/core/services)
const getWorkspaceSubscriptionService = getWorkspaceSubscriptionStatus;

export {
  getSubscriptionProductsService,
  getWorkspaceSeatsService,
  createMultiProductCheckoutService,
  createCheckoutSessionService,
  subscribeToProductService,
  updateSeatsViaStripeService,
  updateSeatCountService,
  getSeatAssignmentsService,
  assignSeatService,
  revokeSeatService,
  getWorkspaceSubscriptionStatus,
  checkProductAccessService,
  getWorkspaceSubscriptionService,
  cancelSubscriptionService,
  getWorkspaceEntitlementsService,
};
