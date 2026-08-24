export type EntitlementEnforcementPolicy = (workspaceId: string) => boolean;

type EnforcementEnvironment = {
  [key: string]: string | undefined;
  ENTITLEMENT_ENFORCEMENT_ENABLED?: string;
  ENTITLEMENT_ENFORCEMENT_WORKSPACE_IDS?: string;
};

/**
 * Enforcement is fail-safe for rollout: disabled unless explicitly enabled.
 * An allowlist can turn it on for selected internal workspaces first.
 */
export function createEntitlementEnforcementPolicy(
  environment: EnforcementEnvironment = process.env,
): EntitlementEnforcementPolicy {
  const globallyEnabled =
    environment.ENTITLEMENT_ENFORCEMENT_ENABLED === 'true';
  const workspaceIds = new Set(
    (environment.ENTITLEMENT_ENFORCEMENT_WORKSPACE_IDS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );

  return (workspaceId) => globallyEnabled || workspaceIds.has(workspaceId);
}
