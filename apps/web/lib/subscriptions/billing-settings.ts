import 'server-only';

import type { BillingClient } from './backend-billing-types';
import {
  BILLING_SETTING_KEYS,
  type BillingSettings,
  parseBillingSettings,
} from './billing-settings-rules';
import { SubscriptionApiError } from './errors';

export type { BillingSettings } from './billing-settings-rules';

export const loadBillingSettings = async (
  client: BillingClient,
): Promise<BillingSettings> => {
  const result = await client
    .from('billing_settings')
    .select('setting_key, value_days')
    .in('setting_key', [...BILLING_SETTING_KEYS]);
  if (result.error) throw result.error;

  try {
    return parseBillingSettings(result.data ?? []);
  } catch (error) {
    throw new SubscriptionApiError(
      error instanceof Error
        ? error.message
        : 'Billing settings are missing or invalid',
      500,
      'ENTITLEMENT_CONFIGURATION_ERROR',
    );
  }
};
