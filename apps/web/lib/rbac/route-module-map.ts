/**
 * Route-to-module (product key) mapping.
 *
 * Maps frontend routes to their corresponding product keys (modules).
 * This ensures proper filtering of team members, roles, and other
 * package-specific data.
 *
 * Examples:
 *   /home/leads              → sales
 *   /home/opportunities      → sales
 *   /home/sales/team-members → sales
 *   /home/services/customers → service_cloud
 *   /home/hrms/employees     → hrms
 */

export const ROUTE_MODULE_MAP: Record<string, string> = {
  // Sales CRM - All sales-related routes
  '/home/sales': 'sales',
  '/home/leads': 'sales',
  '/home/opportunities': 'sales',
  '/home/accounts': 'sales',
  '/home/contacts': 'sales',
  '/home/meetings': 'sales',
  '/home/notes': 'sales',
  '/home/reminders': 'sales',
  '/home/document': 'sales',
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
