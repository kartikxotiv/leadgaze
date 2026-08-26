export type RazorpayPaymentLinkInput = {
  invoiceNumber: string;
  description: string;
  customer: {
    name: string;
    email: string;
    contact?: string | null;
  };
  currency: string;
  amountMinor: number;
  expireBy: Date;
  notes: Record<string, string>;
  callbackUrl: string;
};

export function buildRazorpayPaymentLinkPayload(
  input: RazorpayPaymentLinkInput,
) {
  const currency = input.currency.trim().toUpperCase();
  return {
    amount: input.amountMinor,
    currency,
    accept_partial: false,
    reference_id: input.invoiceNumber,
    description: input.description,
    customer: {
      name: input.customer.name,
      email: input.customer.email,
      ...(input.customer.contact ? { contact: input.customer.contact } : {}),
    },
    expire_by: Math.floor(input.expireBy.getTime() / 1000),
    notify: { email: false, sms: false },
    reminder_enable: false,
    notes: input.notes,
    callback_url: input.callbackUrl,
    callback_method: 'get' as const,
  };
}
