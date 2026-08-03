import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { getLeadByIdService, getLeadsService } from '~/services/leads.service';
import { Lead } from '~/services/leads.service';

/**
 * Hook to provide predictive pre-loading strategies using TanStack Query.
 * This can be used in components to prefetch data for subsequent navigation,
 * eliminating loading times for users.
 */
export const usePreloadStrategies = () => {
  const queryClient = useQueryClient();

  // Pre-load the leads list
  const preloadLeadsList = useCallback(
    (workspaceId: string, limit: number = 20) => {
      if (!workspaceId) return;

      queryClient.prefetchQuery({
        queryKey: ['leads', workspaceId, { page: 1, limit, searchTerm: '', statusId: [] }],
        queryFn: () => getLeadsService({ workspaceId, page: 1, limit, searchTerm: '', statusId: [] }),
        staleTime: 60000, // Cache for 1 minute
      });
    },
    [queryClient],
  );

  // Pre-load a specific lead's details (and optionally related entities like account)
  const preloadLeadDetail = useCallback(
    (workspaceId: string, lead: Partial<Lead>) => {
      if (!workspaceId || !lead?.id) return;

      // Pre-load the lead detail
      queryClient.prefetchQuery({
        queryKey: ['lead', workspaceId, lead.id],
        queryFn: () => getLeadByIdService(lead.id!),
        staleTime: 60000,
      });

      // We could add pre-fetching for Account if lead.account_id exists here,
      // but for now we focus on the core Lead record since getLeadByIdService might fetch related data.
    },
    [queryClient],
  );

  return {
    preloadLeadsList,
    preloadLeadDetail,
  };
};

/**
 * Hook to manage hover preloading with a delay.
 * Prevents unnecessary API calls when the user is just moving their mouse
 * across the table without intent to click.
 */
export const usePreloadHoverHandlers = () => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = useCallback((preloadFn: () => void, delayMs = 500) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      preloadFn();
    }, delayMs);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return { handleMouseEnter, handleMouseLeave };
};
