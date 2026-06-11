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

  if (
    existingSeat?.provider_customer_id &&
    !existingSeat.provider_customer_id?.includes('trial') &&
    !existingSeat.provider_customer_id?.includes('dummy')
  ) {
    return existingSeat.provider_customer_id;
  }

  // Also check workspace metadata (workspaces table may have stripe_customer_id in future)
  const { data: workspace } = await adminClient
    .from('workspaces')
    .select('id, name')
    .eq('id', workspaceId)
    .single();

  // Create a new Stripe customer
  const stripe = getStripeClient();
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

  return customer.id;
}

export { getStripeClient, getStripeWebhookSecret, getOrCreateStripeCustomer };
