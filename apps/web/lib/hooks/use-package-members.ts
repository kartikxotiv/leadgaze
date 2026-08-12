import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

import { getModuleKeyFromPath } from '~/lib/rbac/route-module-map';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getTeamMembersByProduct } from '~/services/workspace-init.service';
import { getMembersService } from '~/services/team-members.service';

/**
 * Hook to fetch team members filtered by the current package/module context
 * 
 * This hook automatically filters team members based on their package access,
 * ensuring that only users with access to the current module are shown.
 * 
 * **OPTIMIZED**: Uses workspace initialization data when available, reducing API calls
 * 
 * @param options - Optional configuration
 * @param options.productKey - Override the auto-detected productKey from route
 * @param options.includeAllMembers - If true, returns all workspace members (no filtering)
 * @param options.forceFresh - If true, forces fresh API call instead of using cached data
 * @returns Query result with filtered members
 * 
 * @example
 * // Auto-detect productKey from current route (OPTIMIZED)
 * const { members, isLoading, isOptimized } = usePackageMembers();
 * 
 * @example
 * // Override productKey manually (OPTIMIZED)
 * const { members } = usePackageMembers({ productKey: 'service_cloud' });
 * 
 * @example
 * // Get all workspace members (for admin pages, OPTIMIZED)
 * const { members } = usePackageMembers({ includeAllMembers: true });
 * 
 * @example
 * // Force fresh API call (bypasses optimization)
 * const { members } = usePackageMembers({ forceFresh: true });
 */
export function usePackageMembers(options?: {
  productKey?: string;
  includeAllMembers?: boolean;
  forceFresh?: boolean;
}) {
  const pathname = usePathname();
  const { currentWorkspace, isInitialized, isLoading: rbacLoading } = useRBAC();

  // Auto-detect productKey from current route
  const autoDetectedProductKey = useMemo(
    () => getModuleKeyFromPath(pathname ?? '/home/sales'),
    [pathname],
  );

  // Determine which productKey to use
  const productKey = options?.includeAllMembers
    ? undefined
    : options?.productKey ?? autoDetectedProductKey;

  // **OPTIMIZED: Use workspace initialization data when available**
  const shouldUseOptimizedData = !options?.forceFresh && 
    isInitialized && 
    !!currentWorkspace?.id;

  // **OPTIMIZED: Get members from workspace initialization data**
  const optimizedQuery = useQuery({
    queryKey: ['workspace-init', 'package-members', currentWorkspace?.id, productKey],
    queryFn: () => {
      // This is a synchronous operation using already-loaded data
      const cachedData = JSON.parse(
        sessionStorage.getItem(`workspace-${currentWorkspace?.id}-init`) || '{}'
      );
      
      if (cachedData?.current_workspace?.team_members) {
        const allMembers = cachedData.current_workspace.team_members;
        
        if (options?.includeAllMembers) {
          return { data: allMembers };
        }
        
        return {
          data: getTeamMembersByProduct(allMembers, productKey)
        };
      }
      
      // Fallback to API call if cached data not found
      return getMembersService(currentWorkspace?.id || '', productKey);
    },
    enabled: shouldUseOptimizedData && !!currentWorkspace?.id,
    staleTime: 5 * 60 * 1000, // Use cached data for 5 minutes
  });

  // Legacy API call (fallback for forced refresh or when optimization not available)
  const legacyQuery = useQuery({
    queryKey: ['team-members', currentWorkspace?.id, productKey],
    queryFn: () => getMembersService(currentWorkspace?.id || '', productKey),
    enabled: !shouldUseOptimizedData && !!currentWorkspace?.id && !rbacLoading,
  });

  // Use optimized data when available, otherwise fallback to legacy
  const activeQuery = shouldUseOptimizedData ? optimizedQuery : legacyQuery;

  // Transform members data to consistent format
  const members = useMemo(
    () =>
      (activeQuery.data?.data || []) as Array<{
        user_id?: string;
        user?: {
          user_metadata?: { full_name?: string } | null;
          email?: string | null;
        };
      }>,
    [activeQuery.data],
  );

  return {
    members,
    membersData: activeQuery.data,
    productKey, // Expose which productKey is being used
    isOptimized: shouldUseOptimizedData,
    ...activeQuery,
  };
}
