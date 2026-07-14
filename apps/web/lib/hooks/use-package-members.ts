import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

import { getModuleKeyFromPath } from '~/lib/rbac/route-module-map';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getMembersService } from '~/services/team-members.service';

/**
 * Hook to fetch team members filtered by the current package/module context
 * 
 * This hook automatically filters team members based on their package access,
 * ensuring that only users with access to the current module are shown.
 * 
 * @param options - Optional configuration
 * @param options.productKey - Override the auto-detected productKey from route
 * @param options.includeAllMembers - If true, returns all workspace members (no filtering)
 * @returns Query result with filtered members
 * 
 * @example
 * // Auto-detect productKey from current route
 * const { members, isLoading } = usePackageMembers();
 * 
 * @example
 * // Override productKey manually
 * const { members } = usePackageMembers({ productKey: 'service' });
 * 
 * @example
 * // Get all workspace members (for admin pages)
 * const { members } = usePackageMembers({ includeAllMembers: true });
 */
export function usePackageMembers(options?: {
  productKey?: string;
  includeAllMembers?: boolean;
}) {
  const pathname = usePathname();
  const { currentWorkspace: workspace } = useRBAC();

  // Auto-detect productKey from current route
  const autoDetectedProductKey = useMemo(
    () => getModuleKeyFromPath(pathname ?? '/home/sales'),
    [pathname],
  );

  // Determine which productKey to use
  const productKey = options?.includeAllMembers
    ? undefined
    : options?.productKey ?? autoDetectedProductKey;

  // Fetch members with optional productKey filter
  const { data: membersData, ...queryResult } = useQuery({
    queryKey: ['team-members', workspace?.id, productKey],
    queryFn: () => getMembersService(workspace?.id || '', productKey),
    enabled: !!workspace?.id,
  });

  // Transform members data to consistent format
  const members = useMemo(
    () =>
      (membersData?.data || []) as Array<{
        user_id?: string;
        user?: {
          user_metadata?: { full_name?: string } | null;
          email?: string | null;
        };
      }>,
    [membersData],
  );

  return {
    members,
    membersData,
    productKey, // Expose which productKey is being used
    ...queryResult,
  };
}
