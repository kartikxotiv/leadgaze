/**
 * Route-to-module mapping for team-members and roles pages.
 *
 * The URL segment before /team-members or /roles determines which
 * core module the page operates on.
 *
 * Examples:
 *   /home/team-members           → sales
 *   /home/sales/team-members     → sales
 *   /home/hrms/team-members      → hrms
 *   /home/services/roles         → service_cloud
 *   /home/inventory/team-members → inventory
 *   /home/funds/roles            → funds
 */

export const ROUTE_MODULE_MAP: Record<string, string> = {
  // Default (no prefix) → sales
  '/home': 'sales',
  '/home/sales': 'sales',
  // HRMS
  '/home/hrms': 'hrms',
  // Service Cloud
  '/home/services': 'service_cloud',
  // Inventory
  '/home/inventory': 'inventory',
  // Fund raising
  '/home/funds': 'funds',
};

/**
 * Extracts the core module key from the current pathname.
 * Matches the longest prefix first (e.g. /home/hrms before /home).
 */
export function getModuleKeyFromPath(pathname: string): string {
  // Sort by length descending to match most specific prefix first
  const sortedPrefixes = Object.keys(ROUTE_MODULE_MAP).sort(
    (a, b) => b.length - a.length,
  );

  for (const prefix of sortedPrefixes) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) {
      return ROUTE_MODULE_MAP[prefix] ?? 'sales';
    }
  }

  // Default fallback
  return 'sales';
}
