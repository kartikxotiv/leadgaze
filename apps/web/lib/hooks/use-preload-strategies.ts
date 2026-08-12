import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { getLeadByIdService, getLeadsService, Lead } from '~/services/leads.service';
import { getContactByIdService, getContactsService, Contact } from '~/services/contacts.service';
import { getAccountByIdService, getAccountsService, Account } from '~/services/accounts.service';
import { getOpportunityByIdService, getOpportunitiesService, Opportunity } from '~/services/opportunities.service';

/**
 * Hook to provide predictive pre-loading strategies using TanStack Query.
 * This can be used in components to prefetch data for subsequent navigation,
 * eliminating loading times for users.
 */
export const usePreloadStrategies = () => {
  const queryClient = useQueryClient();

  // --- LEADS PRELOADING ---
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

  const preloadLeadDetail = useCallback(
    (workspaceId: string, lead: Partial<Lead>) => {
      if (!workspaceId || !lead?.id) return;

      queryClient.prefetchQuery({
        queryKey: ['lead', workspaceId, lead.id],
        queryFn: () => getLeadByIdService(lead.id!),
        staleTime: 60000,
      });
    },
    [queryClient],
  );

  // --- CONTACTS PRELOADING ---
  const preloadContactsList = useCallback(
    (workspaceId: string, limit: number = 20) => {
      if (!workspaceId) return;

      queryClient.prefetchQuery({
        queryKey: ['contacts', workspaceId, { page: 1, limit, searchTerm: '' }],
        queryFn: () => getContactsService({ workspaceId, page: 1, limit, searchTerm: '' }),
        staleTime: 60000,
      });
    },
    [queryClient],
  );

  const preloadContactDetail = useCallback(
    (workspaceId: string, contact: Partial<Contact>) => {
      if (!contact?.id) return;

      queryClient.prefetchQuery({
        queryKey: ['contact', contact.id],
        queryFn: () => getContactByIdService(contact.id!),
        staleTime: 60000,
      });
    },
    [queryClient],
  );

  // --- ACCOUNTS PRELOADING ---
  const preloadAccountsList = useCallback(
    (workspaceId: string, limit: number = 20) => {
      if (!workspaceId) return;

      queryClient.prefetchQuery({
        queryKey: ['accounts', workspaceId, { page: 1, limit, searchTerm: '' }],
        queryFn: () => getAccountsService({ workspaceId, page: 1, limit, searchTerm: '' }),
        staleTime: 60000,
      });
    },
    [queryClient],
  );

  const preloadAccountDetail = useCallback(
    (workspaceId: string, account: Partial<Account>) => {
      if (!account?.id) return;

      queryClient.prefetchQuery({
        queryKey: ['account', account.id],
        queryFn: () => getAccountByIdService(account.id!),
        staleTime: 60000,
      });
    },
    [queryClient],
  );

  // --- OPPORTUNITIES PRELOADING ---
  const preloadOpportunitiesList = useCallback(
    (workspaceId: string, limit: number = 20) => {
      if (!workspaceId) return;

      queryClient.prefetchQuery({
        queryKey: ['opportunities', workspaceId, { page: 1, limit, searchTerm: '' }],
        queryFn: () => getOpportunitiesService({ workspaceId, page: 1, limit, searchTerm: '' }),
        staleTime: 60000,
      });
    },
    [queryClient],
  );

  const preloadOpportunityDetail = useCallback(
    (workspaceId: string, opportunity: Partial<Opportunity>) => {
      if (!opportunity?.id) return;

      queryClient.prefetchQuery({
        queryKey: ['opportunity', opportunity.id],
        queryFn: () => getOpportunityByIdService(opportunity.id!),
        staleTime: 60000,
      });
    },
    [queryClient],
  );

  return {
    preloadLeadsList,
    preloadLeadDetail,
    preloadContactsList,
    preloadContactDetail,
    preloadAccountsList,
    preloadAccountDetail,
    preloadOpportunitiesList,
    preloadOpportunityDetail,
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
