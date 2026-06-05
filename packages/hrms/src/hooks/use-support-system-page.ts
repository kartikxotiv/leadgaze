'use client';

import { useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { showToast } from '../components/global/ToastAlert';
import {
  type SupportSystemTabValue,
  getSupportTabRequests,
} from '../pages/support-system/page.data';
import {
  getSupportSystemDashboardService,
  updateSupportSystemRequestService,
} from '../server/services/support-system.service';
import type {
  SupportSystemRequest,
  SupportSystemRequestUpdatePayload,
} from '../types/support-system.type';
import { handleApiResponse } from '../utils/api-response-handler';

export function useSupportSystemPage(options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SupportSystemTabValue>('all');
  const [selectedRequest, setSelectedRequest] =
    useState<SupportSystemRequest | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);

  const dashboardQuery = useQuery({
    enabled: options?.enabled ?? true,
    queryKey: ['support-system-dashboard'],
    queryFn: getSupportSystemDashboardService,
  });

  const updateRequestMutation = useMutation({
    mutationFn: ({
      requestId,
      payload,
    }: {
      payload: SupportSystemRequestUpdatePayload;
      requestId: string;
    }) => updateSupportSystemRequestService(requestId, payload),
    onError: (error: { message?: string }) => {
      showToast(error.message ?? 'Unable to update support request', 'error');
    },
    onSuccess: async (response) => {
      handleApiResponse(response);
      setIsUpdateDialogOpen(false);
      setSelectedRequest(null);
      await queryClient.invalidateQueries({
        queryKey: ['support-system-dashboard'],
      });
    },
  });

  const requests = useMemo(
    () =>
      getSupportTabRequests(
        dashboardQuery.data?.data.requests ?? [],
        activeTab,
      ),
    [activeTab, dashboardQuery.data?.data.requests],
  );

  return {
    activeTab,
    dashboardData: dashboardQuery.data?.data ?? null,
    dashboardQuery,
    isUpdateDialogOpen,
    requests,
    selectedRequest,
    setActiveTab,
    setIsUpdateDialogOpen,
    setSelectedRequest,
    updateRequestMutation,
    openUpdateDialog: (request: SupportSystemRequest) => {
      setSelectedRequest(request);
      setIsUpdateDialogOpen(true);
    },
  };
}
