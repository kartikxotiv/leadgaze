import type {
  AddModuleRequest,
  AssignModuleUserRequest,
  BundleCheckoutRequest,
  BundleSeatChangeRequest,
  DowngradeSubscriptionRequest,
  PricingCheckoutRequest,
  StartTrialRequest,
  SubscriptionModuleKey,
  UpgradeSubscriptionRequest,
} from '~/lib/subscriptions/contracts';
import ApiClient from '~/utils/axios-client';

const unwrap = <T>(response: { data: { data: T } }) => response.data.data;

type BillingChangeResponse = {
  url?: string;
  sessionId?: string;
  invoiceId?: string | null;
  paymentRequired?: boolean;
  entitled?: boolean;
  changeStatus?: 'applied' | 'pending';
};

export async function getPublicPricingService() {
  return unwrap(await ApiClient.get('/pricing'));
}

export async function getWorkspacePlansService(workspaceId: string) {
  return unwrap(
    await ApiClient.get('/subscriptions/plans', { params: { workspaceId } }),
  );
}

export async function getSubscriptionUsageService(
  workspaceId: string,
  moduleKey: SubscriptionModuleKey,
) {
  return unwrap(
    await ApiClient.get('/subscriptions/usage', {
      params: { workspaceId, moduleKey },
    }),
  );
}

export async function getEntitlementContextService(
  workspaceId: string,
  moduleKey: SubscriptionModuleKey,
) {
  return unwrap(
    await ApiClient.get('/subscriptions/context', {
      params: { workspaceId, moduleKey },
    }),
  );
}

export async function startTrialService(input: StartTrialRequest) {
  return unwrap(await ApiClient.post('/subscriptions/trial/start', input));
}

export async function upgradePlanService(input: UpgradeSubscriptionRequest) {
  return unwrap<BillingChangeResponse>(
    await ApiClient.post('/subscriptions/upgrade', input),
  );
}

export async function downgradePlanService(
  input: DowngradeSubscriptionRequest,
) {
  return unwrap(await ApiClient.post('/subscriptions/downgrade', input));
}

export async function addModuleService(input: AddModuleRequest) {
  return unwrap<BillingChangeResponse>(
    await ApiClient.post('/subscriptions/modules', input),
  );
}

export async function removeModuleService(input: {
  workspaceId: string;
  moduleKey: SubscriptionModuleKey;
}) {
  return unwrap(
    await ApiClient.delete('/subscriptions/modules', { data: input }),
  );
}

export async function createPricingCheckoutService(
  input: PricingCheckoutRequest,
) {
  return unwrap<
    Required<Pick<BillingChangeResponse, 'url' | 'sessionId'>> &
      BillingChangeResponse
  >(await ApiClient.post('/subscriptions/checkout', input));
}

export async function createBundleCheckoutService(
  input: BundleCheckoutRequest,
) {
  return unwrap<
    Required<Pick<BillingChangeResponse, 'url' | 'sessionId'>> &
      BillingChangeResponse
  >(await ApiClient.post('/subscriptions/bundle-checkout', input));
}

export async function updateModuleSeatsService(input: {
  seatId: string;
  newQuantity: number;
  discountCode?: string;
}) {
  return unwrap<BillingChangeResponse>(
    await ApiClient.post('/subscriptions/update-seats', input),
  );
}

export async function updateBundleSeatsService(input: BundleSeatChangeRequest) {
  return unwrap<BillingChangeResponse>(
    await ApiClient.post('/subscriptions/bundle-seats', input),
  );
}

export async function getModuleUsersService(
  workspaceId: string,
  moduleKey: SubscriptionModuleKey,
) {
  return unwrap<{
    workspaceId: string;
    moduleKey: SubscriptionModuleKey;
    users: Array<{
      userId: string;
      name: string | null;
      email: string;
      status: 'active' | 'removed';
    }>;
  }>(
    await ApiClient.get('/subscriptions/module-users', {
      params: { workspaceId, moduleKey },
    }),
  );
}

export async function assignModuleUserService(input: AssignModuleUserRequest) {
  return unwrap(await ApiClient.post('/subscriptions/module-users', input));
}

export async function removeModuleUserService(input: AssignModuleUserRequest) {
  return unwrap(
    await ApiClient.delete('/subscriptions/module-users', { params: input }),
  );
}

export async function getSubscriptionNotificationsService(workspaceId: string) {
  return unwrap<
    Array<{
      id: string;
      event_type: string;
      title: string;
      message: string;
      action_url: string | null;
      read_at: string | null;
      created_at: string;
    }>
  >(
    await ApiClient.get('/subscriptions/notifications', {
      params: { workspaceId },
    }),
  );
}

export async function getBillingInvoicesService(workspaceId: string) {
  return unwrap<
    Array<{
      id: string;
      invoice_number: string;
      purpose: string;
      status: string;
      currency: string;
      total_amount_minor: number;
      seats_before: number;
      seats_after: number;
      due_at: string;
      paid_at: string | null;
      payment_url: string | null;
      created_at: string;
    }>
  >(
    await ApiClient.get('/subscriptions/invoices', {
      params: { workspaceId },
    }),
  );
}
