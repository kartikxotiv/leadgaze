import type { EntitlementModuleKey } from '~/lib/entitlements/types';
import type { EntitlementPlanKey } from '~/lib/entitlements/types';

export const PLAN_ORDER: EntitlementPlanKey[] = [
  'free_forever',
  'launch',
  'growth',
  'scale',
];

export type ModulePlan = {
  moduleKey: EntitlementModuleKey;
  moduleName: string;
  planKey: EntitlementPlanKey;
  planName: string;
  status: string;
  monthlyAmount: number | null;
  yearlyAmount: number | null;
  bundleKey: string | null;
  seatId: string | null;
  seatsPurchased: number;
  seatsUsed: number;
  userCount: number;
};

export type WorkspacePlans = {
  subscriptionStatus: string;
  billingCycle: 'monthly' | 'yearly';
  trialDaysRemaining: number | null;
  modules: ModulePlan[];
  pendingChanges: Array<{
    id: string;
    moduleKey: EntitlementModuleKey;
    changeType: string;
    toPlanKey: EntitlementPlanKey | null;
    effectiveAt: string;
  }>;
};

export type ActiveBundle = {
  key: string;
  seats: number;
  planKey: EntitlementPlanKey;
} | null;

export const titleCase = (value: string) =>
  value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
