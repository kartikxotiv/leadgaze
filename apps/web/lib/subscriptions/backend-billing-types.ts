import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@kit/supabase/database';

import type { BillingCycle, PlanKey, SubscriptionModuleKey } from './contracts';

export type BillingClient = any; // eslint-disable-line @typescript-eslint/no-explicit-any
export type BackendClient = SupabaseClient<Database>;

export type InvoicePurpose =
  | 'initial_purchase'
  | 'plan_upgrade'
  | 'module_add'
  | 'seat_increase'
  | 'renewal'
  | 'bundle_purchase'
  | 'bundle_upgrade'
  | 'bundle_seat_increase'
  | 'bundle_renewal';

export type BillingActor = { id: string; email?: string };

export type CreatePlanInvoiceInput = {
  workspaceId: string;
  moduleKey: SubscriptionModuleKey;
  planKey: PlanKey;
  billingCycle: BillingCycle;
  seats: number;
  purpose: Extract<
    InvoicePurpose,
    'initial_purchase' | 'plan_upgrade' | 'module_add' | 'renewal'
  >;
  actor: BillingActor;
  discountCode?: string;
  idempotencyKey?: string;
  periodStart?: Date;
  dueAt?: Date;
  returnUrl?: string;
};

export type CreateBundleInvoiceInput = {
  workspaceId: string;
  bundleKey: string;
  billingCycle: BillingCycle;
  seats: number;
  purpose: Extract<
    InvoicePurpose,
    'bundle_purchase' | 'bundle_upgrade' | 'bundle_renewal'
  >;
  actor: BillingActor;
  discountCode?: string;
  idempotencyKey?: string;
  periodStart?: Date;
  dueAt?: Date;
  returnUrl?: string;
};

type InvoiceCommon = {
  workspaceId: string;
  planId: string;
  planName?: string;
  billingCycle: BillingCycle;
  seatsBefore: number;
  seatsAfter: number;
  quantity: number;
  unitAmountMinor: number;
  actor: BillingActor;
  discountCode?: string;
  idempotencyKey: string;
  periodStart: Date;
  periodEnd: Date;
  dueAt?: Date;
  returnUrl?: string;
  currency: string;
  workspace: { name?: string | null; owner_id?: string };
};

export type IssueInvoiceInput = InvoiceCommon & {
  moduleId: string;
  moduleName: string;
  purpose: InvoicePurpose;
  seatId?: string;
};

export type IssueBundleInvoiceInput = InvoiceCommon & {
  bundleId: string;
  bundleName: string;
  purpose: Extract<
    InvoicePurpose,
    | 'bundle_purchase'
    | 'bundle_upgrade'
    | 'bundle_seat_increase'
    | 'bundle_renewal'
  >;
  modules: BillingClient[];
  seatByModuleId: Map<string, BillingClient>;
};

export const BILLING_DAY_MS = 86_400_000;

export const addBillingPeriod = (from: Date, cycle: BillingCycle) => {
  const result = new Date(from);
  if (cycle === 'yearly') result.setUTCFullYear(result.getUTCFullYear() + 1);
  else result.setUTCMonth(result.getUTCMonth() + 1);
  return result;
};

export const minorUnits = (amount: number) => Math.round(amount * 100);
