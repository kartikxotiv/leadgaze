import Stripe from 'stripe';

/**
 * Server-side Stripe client singleton.
 * Only use this in server-side code (API routes, server actions).
 */
function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      'STRIPE_SECRET_KEY environment variable is not set. ' +
        'Please add your Stripe secret key to .env.local',
    );
  }

  return new Stripe(secretKey, {
    apiVersion: '2026-05-27.dahlia',
    typescript: true,
  });
}

/**
 * Get the Stripe webhook secret for signature verification.
 */
function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error(
      'STRIPE_WEBHOOK_SECRET environment variable is not set. ' +
        'Please add your Stripe webhook secret to .env.local',
    );
  }

  return secret;
}

/**
 * Maps country code and TIN length to Stripe's supported Tax ID types.
 */
function mapCountryToStripeTaxType(countryIso: string, tin: string): string | null {
  const country = countryIso.toUpperCase();
  const cleanTin = tin.trim().toUpperCase();

  switch (country) {
    case 'SG':
      return 'sg_uen';
    case 'US':
      return 'us_ein';
    case 'IN':
      return cleanTin.length === 15 ? 'in_gst' : 'in_pan';
    case 'GB':
      return 'gb_vat';
    case 'AE':
      return 'ae_trn';
    case 'SA':
      return 'sa_vat';
    case 'BH':
      return 'bh_vat';
    case 'QA':
      return 'qa_tin';
    case 'DE':
    case 'FR':
    case 'IT':
    case 'ES':
    case 'AT':
    case 'BE':
    case 'NL':
    case 'PL':
    case 'IE':
    case 'PT':
    case 'SE':
    case 'FI':
    case 'DK':
      return 'eu_vat';
    default:
      return null;
  }
}

/**
 * Get or create a Stripe customer for the given workspace.
 * Stores the Stripe customer ID in workspace_module_seats provider_metadata
 * or uses the workspace's existing Stripe customer.
 *
 * @returns The Stripe customer ID
 */
async function getOrCreateStripeCustomer(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any,
  workspaceId: string,
  userEmail?: string,
  workspaceName?: string,
): Promise<string> {
  // Check if workspace already has a Stripe customer ID stored
  // Look for it in any existing workspace_module_seats row
  const { data: existingSeat } = await adminClient
    .from('workspace_module_seats')
    .select('id, provider_customer_id')
    .eq('workspace_id', workspaceId)
    .not('provider_customer_id', 'is', null)
    .limit(1)
    .maybeSingle();

  let stripeCustomerId = '';

  if (
    existingSeat?.provider_customer_id &&
    !existingSeat.provider_customer_id?.includes('trial') &&
    !existingSeat.provider_customer_id?.includes('dummy')
  ) {
    stripeCustomerId = existingSeat.provider_customer_id;
  }

  // Fetch workspace details and linked company details for tax sync
  const { data: workspace } = await adminClient
    .from('workspaces')
    .select(`
      id,
      name,
      companies (
        billing_country,
        tax_id
      )
    `)
    .eq('id', workspaceId)
    .single();

  const stripe = getStripeClient();

  if (!stripeCustomerId) {
    // Create a new Stripe customer
    const customer = await stripe.customers.create({
      email: userEmail,
      name: workspaceName ?? workspace?.name ?? 'Leadgaze Workspace',
      metadata: {
        workspace_id: workspaceId,
      },
    });

    console.log({ existingSeat });
    console.log({ customer });

    const { data: updateExistingSeat, error: updateError } = await adminClient
      .from('workspace_module_seats')
      .update({
        provider_customer_id: customer.id,
      })
      .eq('id', existingSeat?.id);

    console.log({ updateExistingSeat, updateError });
  }

  // Sync company tax ID if available and valid
  const company = (workspace as any)?.companies;
  if (company?.tax_id && company?.billing_country) {
    await syncTaxIdToStripe(stripeCustomerId, company.billing_country, company.tax_id);
  }

  return stripeCustomerId;
}

/**
 * Synchronizes the Tax ID to a Stripe customer.
 */
async function syncTaxIdToStripe(
  stripeCustomerId: string,
  billingCountry: string,
  taxId: string
): Promise<void> {
  const stripe = getStripeClient();
  const taxType = mapCountryToStripeTaxType(billingCountry, taxId);
  if (taxType) {
    try {
      const existingTaxIds = await stripe.customers.listTaxIds(stripeCustomerId);
      const exactTaxIdExists = existingTaxIds.data.some(
        (t) => t.value.toUpperCase() === taxId.toUpperCase() && t.type === taxType
      );

      // If the correct tax ID already exists and it's the only one, do nothing
      if (exactTaxIdExists && existingTaxIds.data.length === 1) {
        return;
      }

      // Otherwise, delete all existing tax IDs to prevent duplicates/accumulation
      for (const existing of existingTaxIds.data) {
        try {
          await stripe.customers.deleteTaxId(stripeCustomerId, existing.id);
        } catch (err) {
          console.error(`Failed to delete old tax ID ${existing.id}:`, err);
        }
      }

      // Create the new correct tax ID
      await stripe.customers.createTaxId(stripeCustomerId, {
        type: taxType as any,
        value: taxId,
      });
    } catch (err) {
      console.error('Failed to sync Tax ID to Stripe Customer:', err);
    }
  }
}

export { getStripeClient, getStripeWebhookSecret, getOrCreateStripeCustomer, mapCountryToStripeTaxType, syncTaxIdToStripe };
