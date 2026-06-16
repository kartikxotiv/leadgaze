/**
 * Workspace Subscription Status Service
 *
 * This service is imported by /org/home via `@kit/core/services`.
 * It re-exports the types and fetch function used to display the
 * module selector page.
 */

// ─── Types ───────────────────────────────────────────────────────

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

// ─── Service ─────────────────────────────────────────────────────

/**
 * Fetch workspace subscription status (enabled modules, trial info, etc.)
 * Used by the /org/home module selector page.
 */
export async function getWorkspaceSubscriptionService(
  workspaceId: string,
): Promise<WorkspaceSubscriptionStatus> {
  const baseUrl =
    typeof window !== 'undefined'
      ? ''
      : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const response = await fetch(
    `${baseUrl}/api/subscriptions/workspace-status?workspaceId=${encodeURIComponent(workspaceId)}`,
    { credentials: 'include' },
  );

  if (!response.ok) {
    const err = await response
      .json()
      .catch(() => ({ message: 'Failed to fetch subscription status' }));
    throw new Error(err.message || 'Failed to fetch subscription status');
  }

  const json = await response.json();
  return json.data as WorkspaceSubscriptionStatus;
}
