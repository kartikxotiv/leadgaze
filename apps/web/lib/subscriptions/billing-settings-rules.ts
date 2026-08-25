export const BILLING_SETTING_KEYS = [
  'invoice_due_days',
  'renewal_invoice_days',
  'grace_period_days',
] as const;

export type BillingSettingKey = (typeof BILLING_SETTING_KEYS)[number];

export type BillingSettings = {
  invoiceDueDays: number;
  renewalInvoiceDays: number;
  gracePeriodDays: number;
};

type BillingSettingRow = {
  setting_key: string;
  value_days: number;
};

const getRequiredDays = (
  values: Map<string, number>,
  key: BillingSettingKey,
  minimum: number,
) => {
  const value = values.get(key);
  if (
    !Number.isInteger(value) ||
    value === undefined ||
    value < minimum ||
    value > 365
  ) {
    throw new Error(`Billing setting ${key} is missing or invalid`);
  }
  return value;
};

export const parseBillingSettings = (
  rows: readonly BillingSettingRow[],
): BillingSettings => {
  const values = new Map(rows.map((row) => [row.setting_key, row.value_days]));
  return {
    invoiceDueDays: getRequiredDays(values, 'invoice_due_days', 1),
    renewalInvoiceDays: getRequiredDays(values, 'renewal_invoice_days', 1),
    gracePeriodDays: getRequiredDays(values, 'grace_period_days', 0),
  };
};
